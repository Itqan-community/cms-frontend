import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of, throwError } from 'rxjs';
import { AssetsService } from '../../../../gallery/services/assets.service';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { IssuesService } from '../../services/issues.service';
import { IssueFormComponent } from './issue-form.component';

describe('IssueFormComponent', () => {
  const isStaff = signal(false);
  const selectedPublisherId = signal<number | null>(7);
  let getAssets: jasmine.Spy;
  let create: jasmine.Spy;
  let message: jasmine.SpyObj<NzMessageService>;

  beforeEach(() => {
    isStaff.set(false);
    selectedPublisherId.set(7);
    getAssets = jasmine.createSpy('getAssets').and.returnValue(of({ results: [] }));
    create = jasmine.createSpy('create').and.returnValue(of({ id: 5 }));
    message = jasmine.createSpyObj('NzMessageService', ['error', 'success']);
    TestBed.configureTestingModule({
      imports: [IssueFormComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map(), routeConfig: { path: 'new' } } },
        },
        { provide: AssetsService, useValue: { getAssets } },
        { provide: IssuesService, useValue: { create } },
        { provide: NzMessageService, useValue: message },
        { provide: AdminAuthService, useValue: { isStaff } },
        { provide: AdminTenantService, useValue: { selectedPublisherId } },
      ],
    });
  });

  function search(query: string): void {
    const component = TestBed.createComponent(IssueFormComponent).componentInstance;
    component.ngOnInit();
    component.onAssetSearch(query);
    tick(300);
  }

  it("searches only the selected publisher's assets for publisher users", fakeAsync(() => {
    // Act
    search('mushaf');

    // Assert
    expect(getAssets).toHaveBeenCalledWith([], 'mushaf', [], 7);
  }));

  it("searches the selected publisher's assets for Itqan staff too", fakeAsync(() => {
    // Arrange — the saved report opens on a detail page scoped to the selected publisher
    isStaff.set(true);

    // Act
    search('mushaf');

    // Assert
    expect(getAssets).toHaveBeenCalledWith([], 'mushaf', [], 7);
  }));

  function formWithAsset(category: string) {
    getAssets.and.returnValue(
      of({ results: [{ id: 11, name: 'Asset', category, mushaf_layout: null }] })
    );
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(IssueFormComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    tick(300);
    component.form.patchValue({ asset_id: 11, description: 'A long enough description.' });
    return component;
  }

  it('asks for surah and ayah on a recitation and sends them', fakeAsync(() => {
    // Arrange
    const component = formWithAsset('recitation');

    // Act
    component.contextForm.patchValue({ surah: 2, ayah: 255 });
    component.onSubmit();

    // Assert
    expect(component.contextKind()).toBe('ayah');
    expect(create).toHaveBeenCalledWith({
      asset_id: 11,
      description: 'A long enough description.',
      context: { surah: 2, ayah: 255 },
    });
  }));

  it('sends no location for a program', fakeAsync(() => {
    // Arrange
    const component = formWithAsset('program');

    // Act
    component.onSubmit();

    // Assert
    expect(component.contextKind()).toBeNull();
    expect(create).toHaveBeenCalledWith(jasmine.objectContaining({ context: null }));
  }));

  it('blocks submit until a recitation has both surah and ayah', fakeAsync(() => {
    // Arrange
    const component = formWithAsset('recitation');

    // Act
    component.onSubmit();
    component.contextForm.patchValue({ surah: 2 });
    component.onSubmit();

    // Assert
    expect(create).not.toHaveBeenCalled();
    expect(component.contextForm.controls.surah.touched).toBeTrue();
  }));

  it('keeps the location fields after a blocked submit when the picked asset left the list', fakeAsync(() => {
    // Arrange — a later search no longer lists the picked asset
    const component = formWithAsset('recitation');
    getAssets.and.returnValue(
      of({ results: [{ id: 12, name: 'Other', category: 'program', mushaf_layout: null }] })
    );
    component.onAssetSearch('other');
    tick(300);

    // Act
    component.onSubmit();

    // Assert
    expect(component.contextKind()).toBe('ayah');
    expect(component.contextForm.controls.surah.hasError('required')).toBeTrue();
    expect(create).not.toHaveBeenCalled();
  }));

  it('blocks submit until a mushaf has a page', fakeAsync(() => {
    // Arrange
    const component = formWithAsset('mushaf');

    // Act
    component.onSubmit();

    // Assert
    expect(create).not.toHaveBeenCalled();
    expect(component.contextForm.controls.page.hasError('required')).toBeTrue();
  }));

  it('accepts a font report with a glyph only, but not with neither', fakeAsync(() => {
    // Arrange
    const component = formWithAsset('font');

    // Act
    component.onSubmit();
    const blockedWithNeither = create.calls.count() === 0;
    component.contextForm.patchValue({ glyph: 'لا' });
    component.onSubmit();

    // Assert
    expect(blockedWithNeither).toBeTrue();
    expect(create).toHaveBeenCalledWith(jasmine.objectContaining({ context: { glyph: 'لا' } }));
  }));

  it('resets the location and its rules when the asset changes', fakeAsync(() => {
    // Arrange
    getAssets.and.returnValue(
      of({
        results: [
          { id: 11, name: 'Recitation', category: 'recitation', mushaf_layout: null },
          { id: 12, name: 'Program', category: 'program', mushaf_layout: null },
        ],
      })
    );
    const component = TestBed.createComponent(IssueFormComponent).componentInstance;
    component.ngOnInit();
    tick(300);
    component.form.controls.asset_id.setValue(11);
    component.contextForm.patchValue({ surah: 2, ayah: 1 });

    // Act
    component.form.controls.asset_id.setValue(12);

    // Assert
    expect(component.contextForm.getRawValue().surah).toBeNull();
    expect(component.contextForm.valid).toBeTrue();
  }));

  it("shows the backend's message once when the location is rejected", fakeAsync(() => {
    // Arrange
    const component = formWithAsset('mushaf');
    create.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              error_name: 'invalid_issue_context',
              message: 'Page must be a positive number.',
            },
          })
      )
    );

    // Act
    component.contextForm.patchValue({ page: 4 });
    component.onSubmit();

    // Assert
    expect(message.error).toHaveBeenCalledOnceWith('Page must be a positive number.');
  }));

  function editForm(context: object | null) {
    const patch = jasmine.createSpy('patch').and.returnValue(of({ id: 9 }));
    const issue = {
      id: 9,
      asset_id: 11,
      asset_name: 'Mushaf',
      asset_category: 'mushaf',
      description: 'An existing description.',
      status: 'pending',
      context,
    };
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { paramMap: new Map([['id', '9']]), routeConfig: { path: ':id/edit' } },
      },
    });
    TestBed.overrideProvider(IssuesService, {
      useValue: { get: () => of(issue), patch },
    });
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const component = TestBed.createComponent(IssueFormComponent).componentInstance;
    component.ngOnInit();
    return { component, patch };
  }

  it('lets an older report without a location change status and keeps it unlocated', fakeAsync(() => {
    // Arrange
    const { component, patch } = editForm(null);

    // Act
    component.form.patchValue({ status: 'resolved' });
    component.onSubmit();

    // Assert
    expect(component.contextRequired()).toBeFalse();
    expect(patch).toHaveBeenCalledWith(9, {
      description: 'An existing description.',
      status: 'resolved',
    });
  }));

  it('keeps the location required when editing a report that has one', fakeAsync(() => {
    // Arrange
    const { component, patch } = editForm({ page: 4 });

    // Act
    component.contextForm.patchValue({ page: null });
    component.onSubmit();

    // Assert
    expect(component.contextRequired()).toBeTrue();
    expect(patch).not.toHaveBeenCalled();
  }));
});
