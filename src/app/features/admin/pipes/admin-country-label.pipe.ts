import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { localizeCountryCodeOrName } from '../utils/display-localization.util';

@Pipe({
  name: 'adminCountryLabel',
  standalone: true,
  pure: false,
})
export class AdminCountryLabelPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(countryCode: string | null | undefined): string {
    return localizeCountryCodeOrName(countryCode, this.translate.currentLang);
  }
}
