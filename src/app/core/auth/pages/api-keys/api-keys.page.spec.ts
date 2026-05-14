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

  it('create form is hidden initially and toggles with actions', () => {
    expect(page.showCreateForm()).toBe(false);
    page.openCreateForm();
    expect(page.showCreateForm()).toBe(true);
    page.cancelCreateForm();
    expect(page.showCreateForm()).toBe(false);
  });
});
