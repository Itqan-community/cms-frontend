import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { SeoService } from '../../core/services/seo.service';

/** Sets a landing page's title and description once its copy is loaded, and on language changes. */
export function useLandingSeo(prefix: string, path: string): void {
  const seo = inject(SeoService);
  const titleKey = `${prefix}.SEO_TITLE`;
  const descKey = `${prefix}.SEO_DESC`;
  inject(TranslateService)
    .stream([titleKey, descKey])
    .pipe(takeUntilDestroyed(inject(DestroyRef)))
    .subscribe((t: Record<string, string>) =>
      seo.setSeo({ title: t[titleKey], description: t[descKey], path })
    );
}
