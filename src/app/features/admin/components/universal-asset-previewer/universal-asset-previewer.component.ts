import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  HttpClient,
} from '@angular/common/http';

import {
  DomSanitizer,
  SafeResourceUrl,
} from '@angular/platform-browser';

import {
  TranslateModule,
} from '@ngx-translate/core';

import {
  NzButtonModule,
} from 'ng-zorro-antd/button';

import {
  NzPaginationModule,
} from 'ng-zorro-antd/pagination';

import {
  NzTableModule,
} from 'ng-zorro-antd/table';

import hljs from 'highlight.js/lib/core';

import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import less from 'highlight.js/lib/languages/less';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage(
  'bash',
  bash,
);

hljs.registerLanguage(
  'css',
  css,
);

hljs.registerLanguage(
  'javascript',
  javascript,
);

hljs.registerLanguage(
  'json',
  json,
);

hljs.registerLanguage(
  'less',
  less,
);

hljs.registerLanguage(
  'scss',
  scss,
);

hljs.registerLanguage(
  'sql',
  sql,
);

hljs.registerLanguage(
  'typescript',
  typescript,
);

hljs.registerLanguage(
  'xml',
  xml,
);

hljs.registerLanguage(
  'yaml',
  yaml,
);

export type PreviewType =
  | 'audio'
  | 'image'
  | 'pdf'
  | 'csv'
  | 'code'
  | 'text'
  | 'unsupported';

interface DiffLine {
  type:
    | 'same'
    | 'removed'
    | 'added';

  text: string;
}

@Component({
  selector:
    'app-universal-asset-previewer',

  standalone: true,

  imports: [
    NzButtonModule,
    NzTableModule,
    NzPaginationModule,
    TranslateModule,
  ],

  templateUrl:
    './universal-asset-previewer.component.html',

  styleUrl:
    './universal-asset-previewer.component.less',
})
export class UniversalAssetPreviewerComponent
  implements OnInit, OnDestroy
{
  private readonly http =
    inject(HttpClient);

  private readonly sanitizer =
    inject(DomSanitizer);

  private readonly destroyRef =
    inject(DestroyRef);

  private previewObjectUrl:
    string | null = null;

  readonly fileUrl =
    input.required<string>();

  readonly fileName =
    input.required<string>();

  readonly originalText =
    input<string | null>(null);

  readonly modifiedText =
    input<string | null>(null);

  readonly textContent =
    signal<string>('');

  readonly loading =
    signal(false);

  readonly binaryLoading =
    signal(false);

  readonly error =
    signal(false);

  readonly binaryError =
    signal(false);

  readonly imageZoom =
    signal(1);

  readonly imageError =
    signal(false);

  readonly csvRows =
    signal<string[][]>([]);

  readonly csvPage =
    signal(1);

  readonly csvPageSize =
    signal(10);

  readonly previewObjectUrlSignal =
    signal<string | null>(null);

  readonly highlightedCode =
    computed<string>(() => {
      const code =
        this.textContent();

      if (
        this.previewType() !==
          'code' ||
        !code
      ) {
        return '';
      }

      const language =
        this.getHighlightLanguage(
          this.fileName(),
        );

      try {
        if (language) {
          return hljs.highlight(
            code,
            {
              language,
            },
          ).value;
        }

        return hljs.highlightAuto(
          code,
        ).value;
      } catch {
        return hljs.highlightAuto(
          code,
        ).value;
      }
    });

  readonly csvHeaders =
    computed<string[]>(() => {
      const rows =
        this.csvRows();

      if (rows.length === 0) {
        return [];
      }

      return rows[0];
    });

  readonly csvDataRows =
    computed<string[][]>(() => {
      const rows =
        this.csvRows();

      if (rows.length <= 1) {
        return [];
      }

      return rows.slice(1);
    });

  readonly csvPageRows =
    computed<string[][]>(() => {
      const rows =
        this.csvDataRows();

      const start =
        (this.csvPage() - 1) *
        this.csvPageSize();

      const end =
        start +
        this.csvPageSize();

      return rows.slice(
        start,
        end,
      );
    });

  readonly previewType =
    computed<PreviewType>(() => {
      const extension =
        this.getExtension(
          this.fileUrl(),
        );

      if (
        [
          'mp3',
          'wav',
          'ogg',
          'm4a',
          'aac',
        ].includes(extension)
      ) {
        return 'audio';
      }

      if (
        [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'svg',
        ].includes(extension)
      ) {
        return 'image';
      }

      if (
        extension === 'pdf'
      ) {
        return 'pdf';
      }

      if (
        extension === 'csv'
      ) {
        return 'csv';
      }

      if (
        [
          'ts',
          'js',
          'jsx',
          'tsx',
          'html',
          'css',
          'less',
          'scss',
          'json',
          'xml',
          'yaml',
          'yml',
          'sql',
          'sh',
          'bash',
        ].includes(extension)
      ) {
        return 'code';
      }

      if (
        [
          'txt',
          'md',
          'text',
        ].includes(extension)
      ) {
        return 'text';
      }

      return 'unsupported';
    });

  readonly previewUrl =
    computed<string>(() => {
      return (
        this.previewObjectUrlSignal() ??
        this.fileUrl()
      );
    });

  readonly safeFileUrl =
    computed<SafeResourceUrl>(() => {
      return this.sanitizer
        .bypassSecurityTrustResourceUrl(
          this.previewUrl(),
        );
    });

  readonly diffMode =
    computed(() => {
      return (
        this.originalText() !== null &&
        this.modifiedText() !== null
      );
    });

  readonly diffLines =
    computed<string[]>(() => {
      if (!this.diffMode()) {
        return [];
      }

      return this.buildDiff(
        this.originalText() ?? '',
        this.modifiedText() ?? '',
      ).map(
        (line) => line.text,
      );
    });

  ngOnInit(): void {
    const type =
      this.previewType();

    if (
      type === 'csv' ||
      type === 'code' ||
      type === 'text'
    ) {
      this.loadTextFile();

      return;
    }

    if (
      type === 'audio' ||
      type === 'image' ||
      type === 'pdf'
    ) {
      this.loadBinaryFile();
    }
  }

  ngOnDestroy(): void {
    this.revokePreviewObjectUrl();
  }

  loadTextFile(): void {
    if (this.loading()) {
      return;
    }

    const type =
      this.previewType();

    if (
      type !== 'csv' &&
      type !== 'code' &&
      type !== 'text'
    ) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.http
      .get(
        this.fileUrl(),
        {
          responseType: 'text',
        },
      )
      .subscribe({
        next: (content) => {
          this.textContent.set(
            content,
          );

          if (
            type === 'csv'
          ) {
            this.parseCsv(
              content,
            );
          }

          this.loading.set(false);
        },

        error: (err) => {
          console.error(
            'Failed to load preview file:',
            err,
          );

          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  loadBinaryFile(): void {
    if (this.binaryLoading()) {
      return;
    }

    const type =
      this.previewType();

    if (
      type !== 'audio' &&
      type !== 'image' &&
      type !== 'pdf'
    ) {
      return;
    }

    this.binaryLoading.set(true);
    this.binaryError.set(false);
    this.imageError.set(false);

    this.revokePreviewObjectUrl();

    this.http
      .get(
        this.fileUrl(),
        {
          responseType: 'blob',
        },
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (blob) => {
          this.previewObjectUrl =
            URL.createObjectURL(blob);

          this.previewObjectUrlSignal.set(
            this.previewObjectUrl,
          );

          this.binaryLoading.set(false);
        },

        error: (err) => {
          console.error(
            'Failed to load binary preview file:',
            err,
          );

          this.binaryError.set(true);
          this.binaryLoading.set(false);

          if (
            type === 'image'
          ) {
            this.imageError.set(true);
          }
        },
      });
  }

  zoomIn(): void {
    const current =
      this.imageZoom();

    if (current >= 3) {
      return;
    }

    this.imageZoom.set(
      Math.min(
        3,
        Number(
          (
            current + 0.25
          ).toFixed(2),
        ),
      ),
    );
  }

  zoomOut(): void {
    const current =
      this.imageZoom();

    if (current <= 0.5) {
      return;
    }

    this.imageZoom.set(
      Math.max(
        0.5,
        Number(
          (
            current - 0.25
          ).toFixed(2),
        ),
      ),
    );
  }

  resetZoom(): void {
    this.imageZoom.set(1);
  }

  onImageLoad(): void {
    this.imageError.set(false);
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  onPdfError(): void {
    this.binaryError.set(true);
  }

  onAudioError(): void {
    this.binaryError.set(true);
  }

  onCsvPageChange(
    page: number,
  ): void {
    this.csvPage.set(page);
  }

  onCsvPageSizeChange(
    size: number,
  ): void {
    this.csvPageSize.set(size);
    this.csvPage.set(1);
  }

  private revokePreviewObjectUrl(): void {
    if (!this.previewObjectUrl) {
      return;
    }

    URL.revokeObjectURL(
      this.previewObjectUrl,
    );

    this.previewObjectUrl = null;

    this.previewObjectUrlSignal.set(
      null,
    );
  }

  private parseCsv(
    content: string,
  ): void {
    const rows: string[][] = [];

    let row: string[] = [];

    let cell = '';

    let insideQuotes = false;

    for (
      let i = 0;
      i < content.length;
      i++
    ) {
      const char =
        content[i];

      const nextChar =
        content[i + 1];

      if (
        char === '"'
      ) {
        if (
          insideQuotes &&
          nextChar === '"'
        ) {
          cell += '"';
          i++;
        } else {
          insideQuotes =
            !insideQuotes;
        }

        continue;
      }

      if (
        char === ',' &&
        !insideQuotes
      ) {
        row.push(cell);
        cell = '';
        continue;
      }

      if (
        (
          char === '\n' ||
          char === '\r'
        ) &&
        !insideQuotes
      ) {
        if (
          char === '\r' &&
          nextChar === '\n'
        ) {
          i++;
        }

        row.push(cell);
        cell = '';

        if (
          row.some(
            (value) =>
              value.trim() !== '',
          )
        ) {
          rows.push(row);
        }

        row = [];

        continue;
      }

      cell += char;
    }

    if (
      cell !== '' ||
      row.length > 0
    ) {
      row.push(cell);

      if (
        row.some(
          (value) =>
            value.trim() !== '',
        )
      ) {
        rows.push(row);
      }
    }

    this.csvRows.set(rows);
    this.csvPage.set(1);
  }

  private buildDiff(
    original: string,
    modified: string,
  ): DiffLine[] {
    const originalLines =
      original.split(/\r?\n/);

    const modifiedLines =
      modified.split(/\r?\n/);

    const result: DiffLine[] = [];

    const rows =
      originalLines.length + 1;

    const columns =
      modifiedLines.length + 1;

    const lcs: number[][] =
      Array.from(
        { length: rows },
        () =>
          Array<number>(
            columns,
          ).fill(0),
      );

    for (
      let i =
        originalLines.length - 1;
      i >= 0;
      i--
    ) {
      for (
        let j =
          modifiedLines.length - 1;
        j >= 0;
        j--
      ) {
        if (
          originalLines[i] ===
          modifiedLines[j]
        ) {
          lcs[i][j] =
            lcs[i + 1][j + 1] + 1;
        } else {
          lcs[i][j] =
            Math.max(
              lcs[i + 1][j],
              lcs[i][j + 1],
            );
        }
      }
    }

    let i = 0;
    let j = 0;

    while (
      i < originalLines.length &&
      j < modifiedLines.length
    ) {
      if (
        originalLines[i] ===
        modifiedLines[j]
      ) {
        result.push({
          type: 'same',
          text: `  ${originalLines[i]}`,
        });

        i++;
        j++;

        continue;
      }

      if (
        lcs[i + 1][j] >=
        lcs[i][j + 1]
      ) {
        result.push({
          type: 'removed',
          text: `- ${originalLines[i]}`,
        });

        i++;

        continue;
      }

      result.push({
        type: 'added',
        text: `+ ${modifiedLines[j]}`,
      });

      j++;
    }

    while (
      i < originalLines.length
    ) {
      result.push({
        type: 'removed',
        text: `- ${originalLines[i]}`,
      });

      i++;
    }

    while (
      j < modifiedLines.length
    ) {
      result.push({
        type: 'added',
        text: `+ ${modifiedLines[j]}`,
      });

      j++;
    }

    return result;
  }

  private getHighlightLanguage(
    fileName: string,
  ): string | null {
    const extension =
      this.getExtension(
        fileName,
      );

    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'typescript';

      case 'js':
      case 'jsx':
        return 'javascript';

      case 'html':
        return 'xml';

      case 'css':
        return 'css';

      case 'less':
        return 'less';

      case 'scss':
        return 'scss';

      case 'json':
        return 'json';

      case 'xml':
        return 'xml';

      case 'yaml':
      case 'yml':
        return 'yaml';

      case 'sql':
        return 'sql';

      case 'sh':
      case 'bash':
        return 'bash';

      default:
        return null;
    }
  }

  private getExtension(
    url: string,
  ): string {
    if (!url) {
      return '';
    }

    try {
      const parsed =
        new URL(url);

      const pathname =
        parsed.pathname;

      const fileName =
        pathname
          .split('/')
          .pop() ?? '';

      const lastDot =
        fileName.lastIndexOf('.');

      if (lastDot === -1) {
        return '';
      }

      return fileName
        .substring(
          lastDot + 1,
        )
        .toLowerCase();
    } catch {
      const cleanUrl =
        url
          .split('?')[0]
          .split('#')[0];

      const fileName =
        cleanUrl
          .split('/')
          .pop() ?? '';

      const lastDot =
        fileName.lastIndexOf('.');

      if (lastDot === -1) {
        return '';
      }

      return fileName
        .substring(
          lastDot + 1,
        )
        .toLowerCase();
    }
  }
}
