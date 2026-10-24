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

  it('onCreate keeps the full key from the create response on its row', async () => {
    listApiKeys.and.returnValue(of([{ id: '1', name: 'K', maskedKey: 'm', isRevoked: false }]));
    await fixture.whenStable();
    page.openCreateForm();
    page.createForm.patchValue({ name: 'Unit' });
    await page.onCreate();
    expect(page.fullKeyFor(page.keys()[0]!)).toBe('raw');
    expect(page.showCreateForm()).toBe(false);
  });

  it('shows a full key returned by the list with a copy button', async () => {
    listApiKeys.and.returnValue(
      of([{ id: 'a', name: 'App', maskedKey: '••••', fullKey: 'abc.def', isRevoked: false }])
    );
    await page.reload();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('abc.def');
    expect(el.textContent).not.toContain('AUTH.API_KEYS.FULL_KEY_UNAVAILABLE');
    expect(copyButtons(el).length).toBe(1);
  });

  it('shows the masked preview without a copy button when the full key is unavailable', async () => {
    listApiKeys.and.returnValue(
      of([{ id: 'a', name: 'Old', maskedKey: '••••', isRevoked: false }])
    );
    await page.reload();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('AUTH.API_KEYS.FULL_KEY_UNAVAILABLE');
    expect(copyButtons(el).length).toBe(0);
  });

  it('never copies a masked preview', async () => {
    const writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();

    await page.copyKey({ id: 'a', name: 'Old', maskedKey: '••••', isRevoked: false });

    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the full key and confirms', async () => {
    const writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();

    await page.copyKey({
      id: 'a',
      name: 'App',
      maskedKey: '••••',
      fullKey: 'abc.def',
      isRevoked: false,
    });

    expect(writeText).toHaveBeenCalledWith('abc.def');
    expect(page.successMsg()).toBe('AUTH.API_KEYS.COPY_OK');
  });

  it('reports when the clipboard is unavailable', async () => {
    spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('denied'));

    await page.copySnippet();

    expect(page.pageError()).toBe('AUTH.API_KEYS.COPY_ERROR');
  });

  it('shows the header snippet with X-API-Key and X-External-User-Id', () => {
    fixture.detectChanges();

    const snippet = (fixture.nativeElement as HTMLElement).querySelector('.api-keys__snippet');
    expect(snippet?.textContent).toContain('X-API-Key: <YOUR_PUBLIC_KEY>');
    expect(snippet?.textContent).toContain('X-External-User-Id:');
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

  function copyButtons(el: HTMLElement): HTMLButtonElement[] {
    return Array.from(el.querySelectorAll<HTMLButtonElement>('.account-manage__li button')).filter(
      (b) => b.textContent?.trim() === 'AUTH.API_KEYS.COPY'
    );
  }
});
