import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { PrivacyConsentService } from '../../core/services/privacy-consent.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-privacy-page',
  standalone: true,
  imports: [TranslatePipe, DatePipe, NzButtonComponent, BreadcrumbComponent],
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.less'],
})
export class PrivacyPage {
  private readonly consentService = inject(PrivacyConsentService);

  readonly consent = this.consentService.consent;

  changeSettings(): void {
    this.consentService.reopen();
  }
}
