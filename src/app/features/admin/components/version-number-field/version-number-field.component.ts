import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import type { VersionBump } from '../../models/asset-versions.models';
import { isVersionNumber, nextVersionNumber } from '../../utils/version-number.util';

/**
 * How a new tafsir/translation version is numbered. A language's first version
 * takes a starting number the user types (e.g. 7.0); every later one is the
 * latest number bumped by minor (7.0 → 7.1) or major (7.0 → 8.0). The server
 * issues the number, so this only collects the choice and previews it.
 */
@Component({
  selector: 'app-version-number-field',
  standalone: true,
  imports: [FormsModule, TranslateModule, NzFormModule, NzInputModule, NzRadioModule],
  templateUrl: './version-number-field.component.html',
  styleUrl: './version-number-field.component.less',
})
export class VersionNumberFieldComponent {
  /** The language's latest version number; null when the next version is its first. */
  readonly latest = input<string | null>(null);
  /** True while the latest number is being looked up. */
  readonly loading = input(false);
  /** True when the lookup failed — no number can be chosen until it succeeds. */
  readonly error = input(false);
  readonly start = model('');
  readonly bump = model<VersionBump>('minor');

  readonly i18n = 'ADMIN.COMMON.VERSION_NUMBER';
  readonly startInvalid = computed(
    () => this.start().trim() !== '' && !isVersionNumber(this.start())
  );
  readonly nextMinor = computed(() => nextVersionNumber(this.latest() ?? '', 'minor'));
  readonly nextMajor = computed(() => nextVersionNumber(this.latest() ?? '', 'major'));
}
