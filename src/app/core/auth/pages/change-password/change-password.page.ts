import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-change-password-page',
  imports: [ReactiveFormsModule],
  template: `
    <form
      style="padding: 24px; max-width: 420px; display: flex; flex-direction: column; gap: 12px"
      [formGroup]="form"
      (ngSubmit)="submit()"
    >
      <label>
        Current password
        <input type="password" formControlName="current_password" />
      </label>
      <label>
        New password
        <input type="password" formControlName="new_password" />
      </label>
      <button type="submit" [disabled]="form.invalid">Change password</button>
    </form>
  `,
})
export class ChangePasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    new_password: ['', Validators.required],
  });

  async submit(): Promise<void> {
    const v = this.form.getRawValue();
    await firstValueFrom(
      this.auth.headlessAuth.changePassword({
        current_password: v.current_password,
        new_password: v.new_password,
      })
    );
    await this.router.navigateByUrl('/gallery');
  }
}
