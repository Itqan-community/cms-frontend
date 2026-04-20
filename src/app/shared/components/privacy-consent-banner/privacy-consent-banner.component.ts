import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import {
  PrivacyConsent,
  PrivacyConsentService,
} from '../../../core/services/privacy-consent.service';

@Component({
  selector: 'app-privacy-consent-banner',
  imports: [NzButtonModule, NzModalModule, NzCheckboxModule, FormsModule, TranslateModule],
  templateUrl: './privacy-consent-banner.component.html',
  styleUrl: './privacy-consent-banner.component.less',
})
export class PrivacyConsentBannerComponent implements OnInit {
  private readonly privacyConsentService = inject(PrivacyConsentService);
  private readonly router = inject(Router);
  private readonly modal = inject(NzModalService);

  protected showBanner = true;
  protected showCustomizeModal = false;

  // Use an array of options for nz-checkbox-group
  protected consentOptions = [
    {
      label: 'PRIVACY_CONSENT.ANALYTICS_TITLE',
      value: 'analytics',
      description: 'PRIVACY_CONSENT.ANALYTICS_DESCRIPTION',
    },
    {
      label: 'PRIVACY_CONSENT.ERROR_TRACKING_TITLE',
      value: 'errorTracking',
      description: 'PRIVACY_CONSENT.ERROR_TRACKING_DESCRIPTION',
    },
  ];

  protected selectedConsents: string[] = [];

  ngOnInit() {
    // Hide banner if user has already made a choice (consent exists in localStorage)
    const stored = localStorage.getItem('privacy-consent');
    if (stored) {
      this.showBanner = false;
    }
  }

  acceptAll() {
    const consent: PrivacyConsent = {
      analytics: true,
      errorTracking: true,
      timestamp: Date.now(),
    };
    this.privacyConsentService.setConsent(consent);
    this.showBanner = false;
  }

  rejectAll() {
    const consent: PrivacyConsent = {
      analytics: false,
      errorTracking: false,
      timestamp: Date.now(),
    };
    this.privacyConsentService.setConsent(consent);
    this.showBanner = false;
  }

  openCustomizeModal() {
    const currentConsent = this.privacyConsentService.getConsent();
    this.selectedConsents = [];
    if (currentConsent.analytics) this.selectedConsents.push('analytics');
    if (currentConsent.errorTracking) this.selectedConsents.push('errorTracking');
    this.showCustomizeModal = true;
  }

  closeCustomizeModal() {
    this.showCustomizeModal = false;
  }

  saveCustomConsent() {
    const consent: PrivacyConsent = {
      analytics: this.selectedConsents.includes('analytics'),
      errorTracking: this.selectedConsents.includes('errorTracking'),
      timestamp: Date.now(),
    };
    this.privacyConsentService.setConsent(consent);
    this.showBanner = false;
    this.showCustomizeModal = false;
  }

  // Removed toggleAnalytics and toggleErrorTracking as ngModel handles value updates

  navigateToPrivacy() {
    this.router.navigate(['/privacy']);
  }
}
