import { Component, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface UserAvatarData {
  avatar_url?: string;
  name?: string;
  first_name?: string;
}

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  styleUrls: ['./user-avatar.component.less'],
  template: `
    @if (user()?.avatar_url) {
      <img [src]="user()?.avatar_url" [alt]="user()?.name || avatarAlt" [class]="avatarClasses()" />
    } @else {
      <div [class]="fallbackClasses()">
        {{ getInitials(user()?.name || user()?.first_name || avatarInitial) }}
      </div>
    }
  `,
})
export class UserAvatarComponent {
  private readonly translate = inject(TranslateService);

  user = input.required<UserAvatarData | null>();
  size = input<'sm' | 'md' | 'lg'>('md');

  readonly avatarAlt = this.translate.instant('COMMON.USER_AVATAR_ALT');
  readonly avatarInitial = this.translate.instant('COMMON.USER_AVATAR_INITIAL');

  avatarClasses(): string {
    const sizeClasses = {
      sm: 'user-avatar__img--sm',
      md: 'user-avatar__img--md',
      lg: 'user-avatar__img--lg',
    };
    return `user-avatar__img ${sizeClasses[this.size()]}`;
  }

  fallbackClasses(): string {
    const sizeClasses = {
      sm: 'user-avatar__fallback--sm',
      md: 'user-avatar__fallback--md',
      lg: 'user-avatar__fallback--lg',
    };
    return `user-avatar__fallback ${sizeClasses[this.size()]}`;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
