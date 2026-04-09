import { Component, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-state-message',
  imports: [NzButtonModule, RouterModule, NgIcon],
  template: `
    <div class="state-message" [attr.role]="iconVariant() === 'error' ? 'alert' : 'status'">
      @if (icon()) {
        <ng-icon
          [name]="icon()"
          class="state-message__icon"
          [class.state-message__icon--error]="iconVariant() === 'error'"
          aria-hidden="true"
        />
      }
      @if (title()) {
        <h3 class="state-message__title">{{ title() }}</h3>
      }
      @if (message()) {
        <p class="state-message__message">{{ message() }}</p>
      }
      <div class="state-message__actions">
        @if (secondaryActionLabel()) {
          <a nz-button [routerLink]="secondaryRouterLink()">
            {{ secondaryActionLabel() }}
          </a>
        }
        @if (actionLabel()) {
          <button
            nz-button
            [nzType]="actionType()"
            (click)="actionClick.emit()"
            [nzLoading]="actionLoading()"
          >
            @if (actionIcon()) {
              <ng-icon [name]="actionIcon()" aria-hidden="true" />
            }
            {{ actionLabel() }}
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './state-message.component.less',
})
export class StateMessageComponent {
  /** Registered ng-icons name, e.g. lucideSearch */
  icon = input('');
  iconVariant = input<'default' | 'error'>('default');
  title = input('');
  message = input('');
  actionLabel = input('');
  actionIcon = input('');
  actionType = input<'primary' | 'default'>('primary');
  actionLoading = input(false);
  secondaryActionLabel = input('');
  secondaryRouterLink = input('');

  actionClick = output<void>();
}
