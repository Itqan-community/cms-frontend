import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NZ_DRAWER_DATA } from 'ng-zorro-antd/drawer';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ParsedCsv, PreviewFileType, PreviewSource } from './universal-previewer.types';
import { detectFileType, parseCsv } from './universal-previewer.utils';

@Component({
  selector: 'app-universal-previewer',
  standalone: true,
  imports: [NgIcon, NzImageModule, NzResultModule, NzSpinModule, NzTableModule, TranslateModule],
  templateUrl: './universal-previewer.component.html',
  styleUrl: './universal-previewer.component.less',
})
export class UniversalPreviewerComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalData = inject(NZ_MODAL_DATA, { optional: true }) as {
    source?: PreviewSource;
  } | null;
  private readonly drawerData = inject(NZ_DRAWER_DATA, { optional: true }) as {
    source?: PreviewSource;
  } | null;

  /** Inline binding; modal/drawer hosts pass `source` through nzData. */
  source = input<PreviewSource | undefined>(undefined);

  readonly effectiveSource = computed<PreviewSource | null>(() => {
    return this.source() ?? this.modalData?.source ?? this.drawerData?.source ?? null;
  });

  readonly fileType = computed<PreviewFileType>(() => {
    const source = this.effectiveSource();
    return source ? detectFileType(source) : 'unknown';
  });

  readonly mimeType = computed(() => this.effectiveSource()?.mimeType?.trim() ?? '');

  readonly displayTitle = computed(
    () => this.effectiveSource()?.title?.trim() || this.effectiveSource()?.fileName?.trim() || ''
  );

  readonly downloadUrl = computed(() => this.resolvedUrl());

  readonly csvLoading = signal(false);
  readonly csvError = signal<string | null>(null);
  readonly csvData = signal<ParsedCsv>({ headers: [], rows: [] });

  private readonly blobObjectUrl = signal<string | null>(null);
  private csvAbortController: AbortController | null = null;

  readonly resolvedUrl = computed(() => {
    const source = this.effectiveSource();
    if (!source) {
      return '';
    }

    if (source.url?.trim()) {
      return source.url.trim();
    }

    return this.blobObjectUrl() ?? '';
  });

  readonly sanitizedUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.resolvedUrl();
    if (!url) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  constructor() {
    effect(() => {
      const source = this.effectiveSource();
      this.revokeBlobUrl();

      if (source?.blob && !source.url?.trim()) {
        this.blobObjectUrl.set(URL.createObjectURL(source.blob));
      } else {
        this.blobObjectUrl.set(null);
      }
    });

    effect(() => {
      const type = this.fileType();
      const url = this.resolvedUrl();

      if (type !== 'csv' || !url) {
        this.abortCsvRequest();
        this.csvLoading.set(false);
        this.csvError.set(null);
        this.csvData.set({ headers: [], rows: [] });
        return;
      }

      void this.loadCsv(url);
    });

    this.destroyRef.onDestroy(() => {
      this.abortCsvRequest();
      this.revokeBlobUrl();
    });
  }

  private async loadCsv(url: string): Promise<void> {
    this.abortCsvRequest();
    const controller = new AbortController();
    this.csvAbortController = controller;

    this.csvLoading.set(true);
    this.csvError.set(null);
    this.csvData.set({ headers: [], rows: [] });

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      if (controller.signal.aborted) {
        return;
      }

      this.csvData.set(parseCsv(text));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      this.csvError.set('UNIVERSAL_PREVIEWER.CSV_LOAD_ERROR');
    } finally {
      if (!controller.signal.aborted) {
        this.csvLoading.set(false);
      }
    }
  }

  private abortCsvRequest(): void {
    this.csvAbortController?.abort();
    this.csvAbortController = null;
  }

  private revokeBlobUrl(): void {
    const current = this.blobObjectUrl();
    if (current) {
      URL.revokeObjectURL(current);
      this.blobObjectUrl.set(null);
    }
  }
}
