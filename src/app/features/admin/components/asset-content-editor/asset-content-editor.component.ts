import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { AssetVersionParentKind } from '../../models/asset-content.models';
import type { HasUnsavedContent } from '../../guards/unsaved-content.guard';
import { AdminTitleCountComponent } from '../admin-title-count/admin-title-count.component';
import { AssetContentGridComponent } from '../asset-content-grid/asset-content-grid.component';

/**
 * Route-hosted editor page for a translation's / tafsir's per-ayah content.
 * `kind` comes from the route's `data`, `slug` from the `:slug` param.
 * Delegates unsaved-work handling to the embedded grid so the route's
 * `unsavedContentGuard` can confirm and discard the draft on exit.
 */
@Component({
  selector: 'app-asset-content-editor',
  standalone: true,
  imports: [RouterLink, TranslateModule, AdminTitleCountComponent, AssetContentGridComponent],
  templateUrl: './asset-content-editor.component.html',
  styleUrl: './asset-content-editor.component.less',
})
export class AssetContentEditorComponent implements OnInit, HasUnsavedContent {
  private readonly route = inject(ActivatedRoute);
  private readonly grid = viewChild(AssetContentGridComponent);

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

  hasUnsavedWork(): boolean {
    return this.grid()?.hasUnsavedWork() ?? false;
  }

  keepDraftOnLeave(): Promise<boolean> {
    return this.grid()?.keepDraftOnLeave() ?? Promise.resolve(true);
  }
}
