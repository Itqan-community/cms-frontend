import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';

import { environment } from '../../../../../environments/environment';
import type { AssetPackage } from '../../models/assets.model';
import {
  ITQAN_CLI_URL,
  ItqanAddCommandComponent,
} from '../itqan-add-command/itqan-add-command.component';

/**
 * How to get an asset now that the gallery has no download: recitations point
 * to the public API, other assets to the itqan CLI (the install command when
 * the CLI can install them), with links to the API docs and the CLI.
 */
@Component({
  selector: 'app-asset-get-cta',
  imports: [TranslateModule, NgIcon, ItqanAddCommandComponent],
  templateUrl: './asset-get-cta.component.html',
  styleUrl: './asset-get-cta.component.less',
})
export class AssetGetCtaComponent {
  readonly category = input.required<string>();
  /** How the itqan CLI installs the asset; null when it can't. */
  readonly package = input<AssetPackage | null>(null);
  /** The language picked on the page. */
  readonly language = input<string | null>(null);

  readonly apiDocsUrl = environment.API_DOCS_URL;
  readonly cliUrl = ITQAN_CLI_URL;
}
