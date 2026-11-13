import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
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
