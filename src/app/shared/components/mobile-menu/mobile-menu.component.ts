import { NgClass } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NzDrawerModule, NzDrawerPlacement } from 'ng-zorro-antd/drawer';
import { NgIcon } from '@ng-icons/core';
import { LangSwitchComponent } from '../lang-switch/lang-switch.component';
import { NavigationLink } from '../navigation-menu/navigation-menu.component';
import { UserActionsComponent } from '../user-actions/user-actions.component';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [
    NzDrawerModule,
    RouterModule,
    LangSwitchComponent,
    UserActionsComponent,
    TranslatePipe,
    NgClass,
    NgIcon,
  ],
  templateUrl: './mobile-menu.component.html',
  styleUrls: ['./mobile-menu.component.less'],
})
export class MobileMenuComponent {
  private translate = inject(TranslateService);

  isOpen = input.required<boolean>();
  links = input.required<NavigationLink[]>();

  isOpenChange = output<boolean>();
  logout = output<void>();

  get placement(): NzDrawerPlacement {
    return this.translate.getCurrentLang() === 'ar' ? 'left' : 'right';
  }

  get MenuTitle(): string {
    return this.translate.instant('NAVIGATION.MENU');
  }

  close(): void {
    this.isOpenChange.emit(false);
  }
}
