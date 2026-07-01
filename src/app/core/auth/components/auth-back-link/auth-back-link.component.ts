import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-auth-back-link',
  standalone: true,
  imports: [RouterLink, TranslateModule, NgIcon],
  template: `
    @if (useRouter()) {
      <a [routerLink]="route()" class="auth-guest__back" [title]="labelKey() | translate">
        <ng-icon name="lucideUndo2" class="auth-guest__back-icon" aria-hidden="true" />
        {{ labelKey() | translate }}
      </a>
    } @else {
      <button
        type="button"
        class="auth-guest__back"
        [title]="labelKey() | translate"
        [disabled]="disabled()"
        (click)="clicked.emit()"
      >
        <ng-icon name="lucideUndo2" class="auth-guest__back-icon" aria-hidden="true" />
        {{ labelKey() | translate }}
      </button>
    }
  `,
})
export class AuthBackLinkComponent {
  readonly route = input<string | string[]>(['/']);
  readonly labelKey = input.required<string>();
  readonly useRouter = input(true);
  readonly disabled = input(false);

  readonly clicked = output<void>();
}
