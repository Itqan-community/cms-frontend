import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { appLucideIconsProvider } from '../../../../icons/provide-app-lucide-icons';
import { IssuesService } from '../../../admin/issues/services/issues.service';
import type { AssetAccessStatus, AssetDetails } from '../../models/assets.model';
import { AssetsService } from '../../services/assets.service';
import { AssetDetailsPage } from './asset-details.page';

describe('AssetDetailsPage actions', () => {
  function asset(overrides: Partial<AssetDetails> = {}): AssetDetails {
    return {
      id: 7,
      category: 'text',
      tags: [],
      name: 'Tafsir',
      description: '',
      long_description: '',
      thumbnail_url: '',
      publisher: { id: 1, name: 'Publisher', description: '' },
      resource: { id: 3 },
      license: 'CC0',
      is_open_access: false,
      access_status: null,
      snapshots: [],
      available_languages: [],
      template: null,
      mushaf_layout: null,
      package: { slug: 'tafsir-jalalayn', languages: [{ language: 'ar', is_source: true }] },
      ...overrides,
    };
  }

  function render(details: AssetDetails, loggedIn: boolean) {
    TestBed.configureTestingModule({
      imports: [AssetDetailsPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        appLucideIconsProvider,
        {
          provide: AssetsService,
          useValue: { getAssetDetails: () => of(details), getFileStructure: () => of(null) },
        },
        { provide: IssuesService, useValue: {} },
        {
          provide: AuthService,
          useValue: { isLoggedIn: () => loggedIn, currentUser: signal(null) },
        },
      ],
    });
    TestBed.overrideProvider(NzModalService, {
      useValue: jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']),
    });
    const fixture = TestBed.createComponent(AssetDetailsPage);
    fixture.detectChanges();
    return fixture;
  }

  function requestButton(el: HTMLElement): HTMLButtonElement | null {
    return el.querySelector('.request-access-button');
  }

  it('has no download button', () => {
    const el: HTMLElement = render(asset({ access_status: 'approved' }), true).nativeElement;

    expect(el.querySelector('[class*="download"]')).toBeNull();
    expect(el.textContent).not.toContain('DOWNLOAD');
  });

  it('shows the install command with a copy button', () => {
    const el: HTMLElement = render(asset(), false).nativeElement;

    expect(el.querySelector('.get-asset-card code')?.textContent?.trim()).toBe(
      'itqan add tafsir-jalalayn'
    );
    expect(el.querySelector('.get-asset-card .copy-button')).not.toBeNull();
  });

  it('sends a logged-out user to log in from "Request access"', () => {
    const fixture = render(asset(), false);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    requestButton(fixture.nativeElement)!.click();

    expect(navigate).toHaveBeenCalledWith(['/account/login'], jasmine.any(Object));
  });

  it('opens the request form when access was not requested', () => {
    const fixture = render(asset({ access_status: 'not_requested' }), true);

    requestButton(fixture.nativeElement)!.click();

    expect(fixture.componentInstance.isModalVisible()).toBeTrue();
  });

  for (const status of ['pending', 'rejected'] as AssetAccessStatus[]) {
    it(`disables "Request access" while the request is ${status}`, () => {
      const el: HTMLElement = render(asset({ access_status: status }), true).nativeElement;

      expect(requestButton(el)?.disabled).toBeTrue();
    });
  }

  it('hides "Request access" once access is approved', () => {
    const el: HTMLElement = render(asset({ access_status: 'approved' }), true).nativeElement;

    expect(requestButton(el)).toBeNull();
    expect(el.textContent).toContain('GALLERY.ACCESS_APPROVED_HINT');
  });

  it('hides "Request access" on open-access assets', () => {
    const el: HTMLElement = render(asset({ is_open_access: true }), false).nativeElement;

    expect(requestButton(el)).toBeNull();
  });
});

describe('AssetDetailsPage after a server render', () => {
  const guestAsset = { id: 7, access_status: null, snapshots: [] } as unknown as AssetDetails;
  const userAsset = { ...guestAsset, access_status: 'approved' } as AssetDetails;
  let serverMarker: HTMLElement;

  beforeEach(() => {
    serverMarker = document.createElement('div');
    serverMarker.setAttribute('ng-server-context', 'ssr');
    document.body.appendChild(serverMarker);
  });

  afterEach(() => serverMarker.remove());

  function create(signedIn: boolean) {
    const getAssetDetails = jasmine
      .createSpy('getAssetDetails')
      .and.callFake((_id: string, options?: { skipTransferCache?: boolean }) =>
        of(options?.skipTransferCache ? userAsset : guestAsset)
      );
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AssetsService, useValue: { getAssetDetails } },
        { provide: IssuesService, useValue: {} },
        {
          provide: AuthService,
          useValue: { isLoggedIn: () => false, canActivateAsLoggedIn: () => signedIn },
        },
      ],
    });
    TestBed.overrideComponent(AssetDetailsPage, { set: { template: '', imports: [] } });
    TestBed.overrideProvider(NzModalService, { useValue: {} });
    const page = TestBed.createComponent(AssetDetailsPage).componentInstance;
    page.ngOnInit();
    return { page, getAssetDetails };
  }

  it('fetches the asset again for a signed-in user, past the transfer cache', () => {
    const { page, getAssetDetails } = create(true);

    expect(getAssetDetails).toHaveBeenCalledWith(page.id, { skipTransferCache: true });
    expect(page.asset()?.access_status).toBe('approved');
  });

  it('keeps the server data for a guest', () => {
    const { getAssetDetails } = create(false);

    expect(getAssetDetails).toHaveBeenCalledTimes(1);
  });

  it('refetches access_status when cookie-backed auth finishes after hydration', () => {
    const loggedIn = signal(false);
    const getAssetDetails = jasmine
      .createSpy('getAssetDetails')
      .and.callFake((_id: string, options?: { skipTransferCache?: boolean }) =>
        of(options?.skipTransferCache ? userAsset : guestAsset)
      );
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AssetsService, useValue: { getAssetDetails } },
        { provide: IssuesService, useValue: {} },
        {
          provide: AuthService,
          useValue: { isLoggedIn: () => loggedIn(), canActivateAsLoggedIn: () => loggedIn() },
        },
      ],
    });
    TestBed.overrideComponent(AssetDetailsPage, { set: { template: '', imports: [] } });
    TestBed.overrideProvider(NzModalService, { useValue: {} });
    const fixture = TestBed.createComponent(AssetDetailsPage);
    fixture.detectChanges();

    expect(getAssetDetails).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.asset()?.access_status).toBeNull();

    loggedIn.set(true);
    TestBed.flushEffects();

    expect(getAssetDetails).toHaveBeenCalledWith(fixture.componentInstance.id, {
      skipTransferCache: true,
    });
    expect(fixture.componentInstance.asset()?.access_status).toBe('approved');
  });

  it('opens the report issue modal after auth bootstrap resolves for ?reportIssue=1', () => {
    const loggedIn = signal(false);
    const getAssetDetails = jasmine.createSpy('getAssetDetails').and.returnValue(of(guestAsset));
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              params: { id: '7' },
              queryParamMap: new Map([['reportIssue', '1']]),
            },
          },
        },
        { provide: AssetsService, useValue: { getAssetDetails } },
        { provide: IssuesService, useValue: {} },
        {
          provide: AuthService,
          useValue: { isLoggedIn: () => loggedIn(), canActivateAsLoggedIn: () => loggedIn() },
        },
      ],
    });
    TestBed.overrideComponent(AssetDetailsPage, { set: { template: '', imports: [] } });
    TestBed.overrideProvider(NzModalService, { useValue: {} });
    const fixture = TestBed.createComponent(AssetDetailsPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.isReportIssueModalVisible()).toBeFalse();

    loggedIn.set(true);
    TestBed.flushEffects();

    expect(fixture.componentInstance.isReportIssueModalVisible()).toBeTrue();
  });
});
