import { Component, computed, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

import type { AssetPackage } from '../../models/assets.model';

/** Where users get the itqan CLI, until it has its own landing page. */
export const ITQAN_CLI_URL = 'https://github.com/Itqan-community/itqan-cli';

/** The `itqan add` command that installs an asset, with a copy button and a link to get the CLI. */
@Component({
  selector: 'app-itqan-add-command',
  imports: [TranslateModule, NgIcon, NzButtonModule],
  templateUrl: './itqan-add-command.component.html',
  styleUrl: './itqan-add-command.component.less',
})
export class ItqanAddCommandComponent {
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);

  readonly package = input.required<AssetPackage>();
  /** The language picked on the page; the source language when it isn't installable. */
  readonly language = input<string | null>(null);

  readonly cliUrl = ITQAN_CLI_URL;
  readonly copied = signal(false);

  readonly command = computed(() => {
    const pkg = this.package();
    const chosen =
      pkg.languages.find((lang) => lang.language === this.language()) ??
      pkg.languages.find((lang) => lang.is_source) ??
      pkg.languages[0];
    return chosen && !chosen.is_source
      ? `itqan add ${pkg.slug} --language ${chosen.language}`
      : `itqan add ${pkg.slug}`;
  });

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.command());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
      this.message.success(this.translate.instant('GALLERY.ITQAN_CLI.COPIED'));
    } catch (err) {
      console.warn('[ItqanAddCommand] clipboard unavailable', err);
    }
  }
}
