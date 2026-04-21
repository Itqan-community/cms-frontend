import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { formatHijriYearForAdminListing } from '../utils/display-localization.util';

@Pipe({
  name: 'adminHijriYear',
  standalone: true,
  pure: false,
})
export class AdminHijriYearPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(year: number | null | undefined): string {
    return formatHijriYearForAdminListing(year, {
      suffix: this.translate.instant('ADMIN.COMMON.HIJRI_YEAR_SUFFIX'),
      empty: this.translate.instant('ADMIN.COMMON.EM_DASH'),
    });
  }
}
