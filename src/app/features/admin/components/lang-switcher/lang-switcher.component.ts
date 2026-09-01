import { Component, computed, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { AssetLanguageInstance } from '../../models/asset-language-instance.models';
import {
  canDeleteLanguageInstance,
  canHideLanguageInstance,
  canSetLanguageAsDefault,
  isLanguageInstanceVisible,
  languageInstanceLabel,
} from '../../utils/asset-language-instance.util';

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [
    NgIcon,
    TranslateModule,
    NzButtonModule,
    NzDropDownModule,
    NzTabsModule,
    NzTagModule,
    NzToolTipModule,
  ],
  templateUrl: './lang-switcher.component.html',
  styleUrl: './lang-switcher.component.less',
})
export class LangSwitcherComponent {
  private readonly translate = inject(TranslateService);

  instances = input.required<AssetLanguageInstance[]>();
  activeLangSlug = input<string | null>(null);
  canCreate = input<boolean>(false);
  canRename = input<boolean>(false);
  canDelete = input<boolean>(false);
  canToggleVisibility = input<boolean>(false);
  canSetDefaultLang = input<boolean>(false);

  langSelect = output<string>();
  addLang = output<void>();
  renameLang = output<AssetLanguageInstance>();
  deleteLang = output<AssetLanguageInstance>();
  toggleVisibility = output<AssetLanguageInstance>();
  setDefaultLang = output<AssetLanguageInstance>();

  readonly selectedIndex = computed(() => {
    const slug = this.activeLangSlug();
    const idx = this.instances().findIndex((l) => l.slug === slug);
    return idx >= 0 ? idx : 0;
  });

  instanceLabel(instance: AssetLanguageInstance): string {
    return languageInstanceLabel(instance, this.translate.currentLang);
  }

  isHidden(instance: AssetLanguageInstance): boolean {
    return this.canToggleVisibility() && !isLanguageInstanceVisible(instance);
  }

  canHide(instance: AssetLanguageInstance): boolean {
    return this.canToggleVisibility() && canHideLanguageInstance(instance);
  }

  canSetDefault(instance: AssetLanguageInstance): boolean {
    return this.canSetDefaultLang() && canSetLanguageAsDefault(instance);
  }

  canRemove(instance: AssetLanguageInstance): boolean {
    return this.canDelete() && canDeleteLanguageInstance(instance);
  }

  hasRowActions(instance: AssetLanguageInstance): boolean {
    return (
      this.canRename() ||
      this.canHide(instance) ||
      this.canSetDefault(instance) ||
      this.canRemove(instance)
    );
  }

  onTabIndexChange(index: number): void {
    const instance = this.instances()[index];
    if (!instance || instance.slug === this.activeLangSlug()) return;
    this.langSelect.emit(instance.slug);
  }

  onRename(instance: AssetLanguageInstance): void {
    if (!this.canRename()) return;
    this.renameLang.emit(instance);
  }

  onDelete(instance: AssetLanguageInstance): void {
    if (!this.canRemove(instance)) return;
    this.deleteLang.emit(instance);
  }

  onToggleVisibility(instance: AssetLanguageInstance): void {
    if (!this.canHide(instance)) return;
    this.toggleVisibility.emit(instance);
  }

  onSetDefault(instance: AssetLanguageInstance): void {
    if (!this.canSetDefault(instance)) return;
    this.setDefaultLang.emit(instance);
  }
}
