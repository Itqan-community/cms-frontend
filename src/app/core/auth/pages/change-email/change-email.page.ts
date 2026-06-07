import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import {
  ManagedEmailAddress,
  parseEmailAddressesEnvelope,
} from '../../headless/headless-account-data.util';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-change-email-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./change-email.page.less'],
  templateUrl: './change-email.page.html',
})
export class ChangeEmailPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  readonly emails = signal<ManagedEmailAddress[]>([]);
  readonly isLoading = signal(false);
  readonly pageError = signal('');
  readonly successMsg = signal('');

  readonly addForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.pageError.set('');
    this.isLoading.set(true);
    try {
      const raw = await firstValueFrom(this.auth.headlessAuth.getEmailAddresses());
      this.emails.set(parseEmailAddressesEnvelope(raw));
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? getErrorMessage(e) || this.translate.instant('AUTH.EMAIL.LOAD_ERROR')
          : this.translate.instant('AUTH.EMAIL.LOAD_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async onAddEmail(): Promise<void> {
    if (this.addForm.invalid) {
      return;
    }
    this.clearMsgs();
    this.isLoading.set(true);
    const email = this.addForm.controls.email.value.trim();
    try {
      await firstValueFrom(this.auth.headlessAuth.addEmail({ email }));
      this.successMsg.set(this.translate.instant('AUTH.EMAIL.ADD_SUCCESS'));
      this.addForm.reset();
      await this.reload();
    } catch (e) {
      this.handleErr(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async makePrimary(email: string): Promise<void> {
    this.clearMsgs();
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.headlessAuth.markEmailAsPrimary({ email, primary: true }));
      this.successMsg.set(this.translate.instant('AUTH.EMAIL.PRIMARY_SUCCESS'));
      await this.reload();
    } catch (e) {
      this.handleErr(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async requestVerification(email: string): Promise<void> {
    this.clearMsgs();
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.headlessAuth.requestEmailVerification({ email }));
      this.successMsg.set(this.translate.instant('AUTH.EMAIL.VERIFY_SENT'));
      await this.reload();
    } catch (e) {
      this.handleErr(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async removeEmail(email: string): Promise<void> {
    if (
      !confirm(
        this.translate.instant('AUTH.EMAIL.REMOVE_CONFIRM', {
          email,
        })
      )
    ) {
      return;
    }
    this.clearMsgs();
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.headlessAuth.deleteEmail({ email }));
      this.successMsg.set(this.translate.instant('AUTH.EMAIL.REMOVE_SUCCESS'));
      await this.reload();
    } catch (e) {
      this.handleErr(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  private clearMsgs(): void {
    this.pageError.set('');
    this.successMsg.set('');
  }

  private handleErr(e: unknown): void {
    if (e instanceof HttpErrorResponse) {
      if (tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(getErrorMessage(e) || this.translate.instant('AUTH.EMAIL.ACTION_ERROR'));
      return;
    }
    this.pageError.set(this.translate.instant('AUTH.EMAIL.ACTION_ERROR'));
  }
}
