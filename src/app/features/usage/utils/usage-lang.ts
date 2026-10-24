import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

/**
 * The current UI language as a signal, so `computed` labels and number formats re-run when the
 * user switches language. Call from an injection context (a field initializer).
 */
export function usageLang(): Signal<string> {
  const translate = inject(TranslateService);
  return toSignal(translate.onLangChange.pipe(map((event) => event.lang)), {
    initialValue: translate.currentLang || 'ar',
  });
}
