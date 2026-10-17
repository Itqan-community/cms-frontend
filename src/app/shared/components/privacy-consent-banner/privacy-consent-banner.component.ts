import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzSwitchComponent } from 'ng-zorro-antd/switch';
import { PrivacyConsentService } from '../../../core/services/privacy-consent.service';

/**
 * Bottom banner asking for consent to analytics and error reporting.
 * Shown until the visitor decides, and again when they reopen it from the privacy page.
 */
@Component({
  selector: 'app-privacy-consent-banner',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, NzButtonComponent, NzSwitchComponent],
  templateUrl: './privacy-consent-banner.component.html',
  styleUrls: ['./privacy-consent-banner.component.less'],
})
export class PrivacyConsentBannerComponent {
  private readonly consentService = inject(PrivacyConsentService);

  private readonly customizing = signal(false);

  readonly visible = computed(
    () => this.consentService.consent() === null || this.consentService.reopened()
  );
  readonly showOptions = computed(() => this.customizing() || this.consentService.reopened());

  // Start from the stored choice; nothing is pre-selected for a first-time visitor.
  readonly analytics = linkedSignal(() => this.consentService.consent()?.analytics ?? false);
  readonly errorReporting = linkedSignal(
    () => this.consentService.consent()?.errorReporting ?? false
  );

  /** Shows the per-service switches. */
  customize(): void {
    this.customizing.set(true);
  }

  /** Allows every service and closes the banner. */
  acceptAll(): void {
    this.consentService.acceptAll();
    this.customizing.set(false);
  }

  /** Refuses every service and closes the banner. */
  rejectAll(): void {
    this.consentService.rejectAll();
    this.customizing.set(false);
  }

  /** Saves the switch positions and closes the banner. */
  saveChoices(): void {
    this.consentService.save({
      analytics: this.analytics(),
      errorReporting: this.errorReporting(),
    });
    this.customizing.set(false);
  }
}
