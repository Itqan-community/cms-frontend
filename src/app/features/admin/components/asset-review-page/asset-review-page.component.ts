import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import type { AssetVersionParentKind } from '../../models/asset-versions.models';
import { AssetReviewGridComponent } from '../asset-review-grid/asset-review-grid.component';

/**
 * Route-hosted full-screen page for reviewing a translation's / tafsir's changes.
 * `kind` comes from the route's `data`, `slug` from the `:slug` param.
 */
@Component({
  selector: 'app-asset-review-page',
  standalone: true,
  imports: [RouterLink, TranslateModule, AssetReviewGridComponent],
  templateUrl: './asset-review-page.component.html',
  styleUrl: './asset-review-page.component.less',
})
export class AssetReviewPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly kind = signal<AssetVersionParentKind>('translation');
  readonly slug = signal<string>('');

  get listSegment(): string {
    return this.kind() === 'tafsir' ? 'tafsirs' : 'translations';
  }

  ngOnInit(): void {
    const dataKind = this.route.snapshot.data['kind'] as AssetVersionParentKind | undefined;
    this.kind.set(dataKind ?? 'translation');
    this.slug.set(this.route.snapshot.params['slug'] ?? '');
  }
}
