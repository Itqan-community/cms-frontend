import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzTagModule } from 'ng-zorro-antd/tag';

import type { AssetTemplate } from '../../../features/admin/models/asset-content.models';

/**
 * Shows which content template a text asset uses — "Ayah based", "Word based", etc.
 *
 * Renders nothing at all when the asset has no template. Every category other
 * than translation and tafsir has `template === null`, and a blank pill on a
 * font or recitation card would read as a bug rather than as "not applicable".
 */
@Component({
  selector: 'app-asset-template-badge',
  standalone: true,
  imports: [NzTagModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asset-template-badge.component.html',
  styleUrls: ['./asset-template-badge.component.less'],
})
export class AssetTemplateBadgeComponent {
  readonly template = input<AssetTemplate | null>(null);

  /** Layout name for page-based assets; absent for every other template. */
  readonly layoutName = input<string | null>(null);

  /**
   * The translation key for the current template.
   *
   * Page assets name their layout when one is known. A page asset without a
   * layout falls back to the plain key rather than interpolating an empty
   * string, which would render "Page based ()".
   */
  readonly translationKey = computed<string>(() => {
    const template = this.template();
    if (!template) {
      return '';
    }
    if (template === 'page' && this.layoutName()) {
      return 'ADMIN.ASSET_TEMPLATE.PAGE_WITH_LAYOUT';
    }
    return `ADMIN.ASSET_TEMPLATE.${template.toUpperCase()}`;
  });

  readonly translationParams = computed<Record<string, string>>(() => {
    const layoutName = this.layoutName();
    const params: Record<string, string> = {};
    if (this.template() === 'page' && layoutName) {
      params['layout'] = layoutName;
    }
    return params;
  });
}
