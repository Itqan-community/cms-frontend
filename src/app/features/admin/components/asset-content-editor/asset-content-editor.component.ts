import { Component, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import type { AssetVersionParentKind } from '../../models/asset-content.models';
import type { ContentTemplate, MushafPrint } from '../../models/content-template.models';
import { DEFAULT_CONTENT_TEMPLATE } from '../../utils/content-template.util';
import type { HasUnsavedContent } from '../../guards/unsaved-content.guard';
import { AdminTitleCountComponent } from '../admin-title-count/admin-title-count.component';
import { AssetContentGridComponent } from '../asset-content-grid/asset-content-grid.component';
import { LangSwitcherComponent } from '../lang-switcher/lang-switcher.component';
import type { AssetLanguageInstance } from '../../models/asset-language-instance.models';
import { AssetLanguageInstancesService } from '../../services/asset-language-instances.service';
import { TafsirsService } from '../../tafsirs/services/tafsirs.service';
import { TranslationsService } from '../../translations/services/translations.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import {
  isLanguageInstanceVisible,
  languageInstanceLabel,
} from '../../utils/asset-language-instance.util';

/**
 * Route-hosted editor page for a translation's / tafsir's per-ayah content.
 * Supports optional language instances (`?lang=`) and review mode (`?mode=review`).
 */
@Component({
  selector: 'app-asset-content-editor',
  standalone: true,
  imports: [
    RouterLink,
    TranslateModule,
    NzInputModule,
    NzModalModule,
    AdminTitleCountComponent,
    AssetContentGridComponent,
    LangSwitcherComponent,
  ],
  templateUrl: './asset-content-editor.component.html',
  styleUrl: './asset-content-editor.component.less',
})
export class AssetContentEditorComponent implements OnInit, HasUnsavedContent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly langService = inject(AssetLanguageInstancesService);
  private readonly tafsirsService = inject(TafsirsService);
  private readonly translationsService = inject(TranslationsService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly modal = inject(NzModalService);
  private readonly translate = inject(TranslateService);
  readonly grid = viewChild(AssetContentGridComponent);

  readonly kind = signal<AssetVersionParentKind>('translation');
  readonly slug = signal<string>('');
  readonly template = signal<ContentTemplate>(DEFAULT_CONTENT_TEMPLATE);
  readonly mushafPrint = signal<MushafPrint | null>(null);
  readonly langInstances = signal<AssetLanguageInstance[]>([]);
  readonly activeLangSlug = signal<string | null>(null);
  readonly reviewMode = signal(false);
  readonly readOnly = computed(() => this.reviewMode());

  readonly languageInstancesEnabled = environment.assetLanguageInstances;
  readonly showLangSwitcher = computed(
    () => this.languageInstancesEnabled || this.langInstances().length > 1
  );

  readonly visibleLangInstances = computed(() =>
    this.langInstances().filter((l) => {
      if (isLanguageInstanceVisible(l)) return true;
      return this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS);
    })
  );

  readonly referenceLangOptions = computed(() =>
    this.visibleLangInstances()
      .filter((l) => l.slug !== this.activeLangSlug())
      .map((l) => ({
        slug: l.slug,
        label: languageInstanceLabel(l, this.translate.currentLang),
      }))
  );

  get listSegment(): string {
    return this.kind() === 'tafsir' ? 'tafsirs' : 'translations';
  }

  constructor() {
    effect(() => {
      const grid = this.grid();
      if (grid) {
        grid.setReferenceLangOptions(this.referenceLangOptions());
      }
    });
  }

  ngOnInit(): void {
    const dataKind = this.route.snapshot.data['kind'] as AssetVersionParentKind | undefined;
    this.kind.set(dataKind ?? 'translation');
    this.slug.set(this.route.snapshot.params['slug'] ?? '');
    this.reviewMode.set(this.route.snapshot.queryParamMap.get('mode') === 'review');
    this.loadAssetMeta();
    this.loadLanguageInstances();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const lang = params.get('lang');
      if (lang && lang !== this.activeLangSlug()) {
        this.activeLangSlug.set(lang);
      }
      this.reviewMode.set(params.get('mode') === 'review');
    });
  }

  hasUnsavedWork(): boolean {
    return this.grid()?.hasUnsavedWork() ?? false;
  }

  keepDraftOnLeave(): Promise<boolean> {
    return this.grid()?.keepDraftOnLeave() ?? Promise.resolve(true);
  }

  onLangSelect(langSlug: string): void {
    if (langSlug === this.activeLangSlug()) return;
    if (this.hasUnsavedWork()) {
      this.modal.confirm({
        nzTitle: this.translate.instant('ADMIN.CONTENT_EDITOR.LANGUAGES.LEAVE_TITLE'),
        nzContent: this.translate.instant('ADMIN.CONTENT_EDITOR.LANGUAGES.LEAVE_BODY'),
        nzOnOk: () => this.applyLangSelection(langSlug),
      });
      return;
    }
    this.applyLangSelection(langSlug);
  }

  onAddLanguage(): void {
    const code = window.prompt(
      this.translate.instant('ADMIN.CONTENT_EDITOR.LANGUAGES.ADD_PROMPT'),
      'en'
    );
    if (!code?.trim()) return;
    this.langService
      .create(this.kind() as 'tafsir' | 'translation', this.slug(), {
        language_code: code.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (instance) => {
          this.langInstances.update((list) => [...list, instance]);
          this.onLangSelect(instance.slug);
        },
      });
  }

  onRenameLanguage(instance: AssetLanguageInstance): void {
    const name = window.prompt(
      this.translate.instant('ADMIN.CONTENT_EDITOR.LANGUAGES.RENAME_PROMPT'),
      instance.name
    );
    if (!name?.trim()) return;
    this.langService
      .patch(this.kind() as 'tafsir' | 'translation', this.slug(), instance.slug, {
        name: name.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.langInstances.update((list) =>
            list.map((l) => (l.slug === instance.slug ? { ...l, ...updated } : l))
          );
        },
      });
  }

  onDeleteLanguage(instance: AssetLanguageInstance): void {
    this.langService
      .delete(this.kind() as 'tafsir' | 'translation', this.slug(), instance.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.langInstances.update((list) => list.filter((l) => l.slug !== instance.slug));
          if (this.activeLangSlug() === instance.slug) {
            const fallback =
              this.langInstances().find((l) => l.is_default) ?? this.langInstances()[0];
            if (fallback) this.applyLangSelection(fallback.slug);
          }
        },
      });
  }

  onToggleLanguageVisibility(instance: AssetLanguageInstance): void {
    this.langService
      .patch(this.kind() as 'tafsir' | 'translation', this.slug(), instance.slug, {
        is_visible: !isLanguageInstanceVisible(instance),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.langInstances.update((list) =>
            list.map((l) => (l.slug === instance.slug ? { ...l, ...updated } : l))
          );
        },
      });
  }

  onSetDefaultLanguage(instance: AssetLanguageInstance): void {
    this.langService
      .patch(this.kind() as 'tafsir' | 'translation', this.slug(), instance.slug, {
        is_default: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadLanguageInstances(),
      });
  }

  private applyLangSelection(langSlug: string): void {
    this.activeLangSlug.set(langSlug);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { lang: langSlug },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private loadAssetMeta(): void {
    const slug = this.slug();
    const kind = this.kind();
    const obs =
      kind === 'tafsir'
        ? this.tafsirsService.getDetail(slug)
        : this.translationsService.getDetail(slug);
    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (asset) => {
        const template = asset.template;
        const mushafPrint = asset.mushaf_print;
        if (template) this.template.set(template);
        if (mushafPrint) this.mushafPrint.set(mushafPrint);
      },
    });
  }

  private loadLanguageInstances(): void {
    this.langService
      .list(this.kind() as 'tafsir' | 'translation', this.slug())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.langInstances.set(list);
          const queryLang = this.route.snapshot.queryParamMap.get('lang');
          const chosen =
            list.find((l) => l.slug === queryLang) ?? list.find((l) => l.is_default) ?? list[0];
          if (chosen) {
            this.activeLangSlug.set(chosen.slug);
            const grid = this.grid();
            if (grid) {
              grid.setReferenceLangOptions(this.referenceLangOptions());
            }
          }
        },
      });
  }
}
