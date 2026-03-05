import { Component, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-state-message',
  imports: [NzButtonModule, RouterModule],
  template: `
    <div class="state-message" [attr.role]="iconVariant() === 'error' ? 'alert' : 'status'">
      @if (icon()) {
        <i
          class="bx {{ icon() }} state-message__icon"
          [class.state-message__icon--error]="iconVariant() === 'error'"
          aria-hidden="true"
        ></i>
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
              <i class="bx {{ actionIcon() }}" aria-hidden="true"></i>
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
