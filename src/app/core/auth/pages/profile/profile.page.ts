import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { resolveAuthErrorMessage } from '../../../../shared/utils/auth-error-resolver.util';
import { UpdateProfileRequest } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-account-profile-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.less'],
})
export class AccountProfilePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  readonly pageError = signal('');
  readonly successMsg = signal('');
  readonly isSaving = signal(false);

  readonly displayName = computed(
    () => this.auth.currentUser()?.name ?? this.translate.instant('COMMON.EM_DASH')
  );
  readonly displayEmail = computed(
    () => this.auth.currentUser()?.email ?? this.translate.instant('COMMON.EM_DASH')
  );
  readonly displayPhone = computed(() => {
    const p = this.auth.currentUser()?.phone;
    return p?.trim() ? p : '';
  });

  readonly profileForm = this.fb.nonNullable.group({
    bio: ['', [Validators.required, Validators.minLength(20)]],
    project_url: [''],
    project_summary: [''],
  });

  ngOnInit(): void {
    void this.loadDetails();
  }

  async loadDetails(): Promise<void> {
    this.pageError.set('');
    try {
      const d = await firstValueFrom(this.auth.getProfileDetails());
      this.auth.applyProfileFromApi(d);
      this.profileForm.patchValue({
        bio: d.bio ?? '',
        project_url: d.project_url ?? '',
        project_summary: d.project_summary ?? '',
      });
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        this.pageError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.PROFILE.LOAD_ERROR', context: 'profile' },
            this.translate
          )
        );
      }
    }
  }

  async onSaveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.pageError.set('');
    this.successMsg.set('');
    this.isSaving.set(true);
    const v = this.profileForm.getRawValue();
    const body: UpdateProfileRequest = {
      bio: v.bio.trim(),
      project_url: v.project_url?.trim() || undefined,
      project_summary: v.project_summary?.trim() || undefined,
    };
    try {
      await firstValueFrom(this.auth.updateProfile(body));
      this.successMsg.set(this.translate.instant('AUTH.PROFILE.SAVE_SUCCESS'));
      await this.loadDetails();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        this.pageError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.PROFILE.SAVE_ERROR', context: 'profile' },
            this.translate
          )
        );
      } else {
        this.pageError.set(this.translate.instant('AUTH.PROFILE.SAVE_ERROR'));
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  getBioError(): string {
    const c = this.profileForm.get('bio');
    if (c?.hasError('required')) {
      return this.translate.instant('FORMS.VALIDATION.REQUIRED');
    }
    if (c?.hasError('minlength')) {
      return this.translate.instant('FORMS.VALIDATION.FIELD_TOO_SHORT');
    }
    return '';
  }
}
