import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiKeysPage } from './api-keys.page';

describe('ApiKeysPage', () => {
  let fixture: ComponentFixture<ApiKeysPage>;
  let page: ApiKeysPage;
  let listApiKeys: jasmine.Spy;
  let createApiKey: jasmine.Spy;

  beforeEach(async () => {
    listApiKeys = jasmine.createSpy('listApiKeys').and.returnValue(of([]));
    createApiKey = jasmine.createSpy('createApiKey').and.returnValue(
      of({
        key: { id: '1', name: 'K', maskedKey: 'm', isRevoked: false },
        rawKey: 'raw',
      })
    );

    await TestBed.configureTestingModule({
      imports: [ApiKeysPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            listApiKeys,
            createApiKey,
            updateApiKey: jasmine
              .createSpy('updateApiKey')
              .and.returnValue(of({ id: 'x', name: 'y', maskedKey: 'z', isRevoked: false })),
            deleteApiKey: jasmine.createSpy('deleteApiKey').and.returnValue(of(void 0)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeysPage);
    page = fixture.componentInstance;
  });

  it('reload loads keys list', async () => {
    listApiKeys.calls.reset();
    listApiKeys.and.returnValue(of([{ id: 'a', name: 'n', maskedKey: 'mk', isRevoked: false }]));
    await page.reload();
    expect(page.keys().length).toBe(1);
  });

  it('onCreate exposes raw key once in revealedRawKey signal', async () => {
    listApiKeys.and.returnValue(of([]));
    await fixture.whenStable();
    page.openCreateForm();
    page.createForm.patchValue({ name: 'Unit' });
    await page.onCreate();
    expect(page.revealedRawKey()?.raw).toBe('raw');
    expect(page.showCreateForm()).toBe(false);
  });

  it('saveRename sends the app slug only when it changed', async () => {
    const auth = TestBed.inject(AuthService) as unknown as { updateApiKey: jasmine.Spy };
    const key = { id: 'a', name: 'n', maskedKey: 'mk', isRevoked: false, appSlug: 'old-slug' };
    page.startRename(key);
    page.updateSlugDraft('a', 'new-slug');
    await page.saveRename('a');
    expect(auth.updateApiKey).toHaveBeenCalledWith('a', { name: 'n', app_slug: 'new-slug' });

    auth.updateApiKey.calls.reset();
    page.startRename({ ...key, appSlug: 'new-slug' });
    page.updateSlugDraft('a', 'new-slug');
    await page.saveRename('a');
    expect(auth.updateApiKey).toHaveBeenCalledWith('a', { name: 'n' });
  });

  it('saveRename rejects a cleared app slug instead of silently keeping it', async () => {
    const auth = TestBed.inject(AuthService) as unknown as { updateApiKey: jasmine.Spy };
    page.startRename({
      id: 'a',
      name: 'n',
      maskedKey: 'mk',
      isRevoked: false,
      appSlug: 'old-slug',
    });
    page.updateSlugDraft('a', '  ');
    await page.saveRename('a');
    expect(auth.updateApiKey).not.toHaveBeenCalled();
    expect(page.pageError()).toBe('AUTH.API_KEYS.SLUG_REQUIRED');
  });

  it('lists the app slug of each key', async () => {
    listApiKeys.and.returnValue(
      of([{ id: 'a', name: 'n', maskedKey: 'mk', isRevoked: false, appSlug: 'my-app' }])
    );
    await page.reload();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('my-app');
  });

  it('create form is hidden initially and toggles with actions', () => {
    expect(page.showCreateForm()).toBe(false);
    page.openCreateForm();
    expect(page.showCreateForm()).toBe(true);
    page.cancelCreateForm();
    expect(page.showCreateForm()).toBe(false);
  });
});
