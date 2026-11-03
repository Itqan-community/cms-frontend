import { Component, computed, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { RecitationQualityOut } from '../../models/recitation-qualities.models';
import {
  canEditQualityVariant,
  canSetQualityAsDefault,
  canToggleQualityVisibility,
  qualityDisplayName,
  isQualityVisible,
  parseQualityVariant,
} from '../../utils/recitation-quality.util';

/**
 * Quality switcher built on ng-zorro tabs for touch-friendly horizontal scroll and
 * consistency with the rest of the admin UI. Presentational only — the parent owns
 * API calls and the create/rename modal.
 */
@Component({
  selector: 'app-quality-switcher',
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
  templateUrl: './quality-switcher.component.html',
  styleUrl: './quality-switcher.component.less',
})
export class QualitySwitcherComponent {
  private readonly translate = inject(TranslateService);

  qualities = input.required<RecitationQualityOut[]>();
  activeQualitySlug = input<string | null>(null);
  canCreate = input<boolean>(false);
  canRename = input<boolean>(false);
  canDelete = input<boolean>(false);
  /** Off until the portal API exposes `is_visible`; see `environment.recitationQualityVisibility`. */
  canToggleVisibility = input<boolean>(false);
  canSetDefault = input<boolean>(false);

  qualitySelect = output<string>();
  addQuality = output<void>();
  renameQuality = output<RecitationQualityOut>();
  deleteQuality = output<RecitationQualityOut>();
  toggleVisibility = output<RecitationQualityOut>();
  setDefaultQuality = output<RecitationQualityOut>();

  readonly selectedIndex = computed(() => {
    const slug = this.activeQualitySlug();
    const idx = this.qualities().findIndex((f) => f.slug === slug);
    return idx >= 0 ? idx : 0;
  });

  qualityLabel(quality: RecitationQualityOut): string {
    return qualityDisplayName(quality, this.translate.currentLang);
  }

  canEditVariant(quality: RecitationQualityOut): boolean {
    return this.canRename() && canEditQualityVariant(quality);
  }

  hasRowActions(quality: RecitationQualityOut): boolean {
    return (
      this.canEditVariant(quality) ||
      this.canHideQuality(quality) ||
      this.canSetDefaultQuality(quality) ||
      this.canDelete()
    );
  }

  canHideQuality(quality: RecitationQualityOut): boolean {
    return this.canToggleVisibility() && canToggleQualityVisibility(quality);
  }

  canSetDefaultQuality(quality: RecitationQualityOut): boolean {
    return this.canSetDefault() && canSetQualityAsDefault(quality);
  }

  isHidden(quality: RecitationQualityOut): boolean {
    return this.canToggleVisibility() && !isQualityVisible(quality);
  }

  variantActionKey(quality: RecitationQualityOut): string {
    return parseQualityVariant(quality)
      ? 'ADMIN.RECITATIONS.QUALITIES.CHANGE_VARIANT'
      : 'ADMIN.RECITATIONS.QUALITIES.SET_VARIANT';
  }

  onTabIndexChange(index: number): void {
    const quality = this.qualities()[index];
    if (!quality || quality.slug === this.activeQualitySlug()) return;
    this.qualitySelect.emit(quality.slug);
  }

  onRename(quality: RecitationQualityOut): void {
    if (!this.canEditVariant(quality)) return;
    this.renameQuality.emit(quality);
  }

  onDelete(quality: RecitationQualityOut): void {
    if (!this.canDelete() || quality.is_default) return;
    this.deleteQuality.emit(quality);
  }

  onToggleVisibility(quality: RecitationQualityOut): void {
    if (!this.canHideQuality(quality)) return;
    this.toggleVisibility.emit(quality);
  }

  onSetDefault(quality: RecitationQualityOut): void {
    if (!this.canSetDefaultQuality(quality)) return;
    this.setDefaultQuality.emit(quality);
  }
}
