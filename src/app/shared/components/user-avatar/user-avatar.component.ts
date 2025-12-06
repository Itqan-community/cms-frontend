import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UserAvatarData {
  avatar_url?: string;
  name?: string;
  first_name?: string;
}

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./user-avatar.component.less'],
  template: `
    @if (user()?.avatar_url) {
      <img
        [src]="user()?.avatar_url"
        [alt]="user()?.name || 'User Avatar'"
        [class]="avatarClasses()"
      />
    } @else {
      <div [class]="fallbackClasses()">
        {{ getInitials(user()?.name || user()?.first_name || 'U') }}
      </div>
    }
  `,
})
export class UserAvatarComponent {
  user = input.required<UserAvatarData | null>();
  size = input<'sm' | 'md' | 'lg'>('md');

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
