import { Component, computed, input } from '@angular/core';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  ASSET_CHANNEL_I18N,
  ASSET_CHANNEL_KEYS,
  AssetChannelFlags,
  offChannelKeys,
} from '../../utils/asset-channels.util';

/** "Distribution channels" checkboxes; sits inside an asset form that has the four flag controls. */
@Component({
  selector: 'app-asset-channels-fields',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, NzCheckboxModule, NzFormModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  template: `
    <nz-form-item>
      <nz-form-label>{{ 'ADMIN.COMMON.CHANNELS.TITLE' | translate }}</nz-form-label>
      <nz-form-control [nzExtra]="'ADMIN.COMMON.CHANNELS.HELP' | translate">
        @for (key of keys; track key) {
          <div class="asset-channel-option">
            <span nz-checkbox [formControlName]="key">
              {{ 'ADMIN.COMMON.CHANNELS.' + i18n[key] | translate }}
            </span>
            <div class="asset-channel-help">
              {{ 'ADMIN.COMMON.CHANNELS.' + i18n[key] + '_HELP' | translate }}
            </div>
          </div>
        }
      </nz-form-control>
    </nz-form-item>
  `,
  styles: `
    .asset-channel-option {
      margin-bottom: 8px;
    }
    .asset-channel-help {
      color: var(--admin-text-500);
      font-size: 12px;
    }
  `,
})
export class AssetChannelsFieldsComponent {
  readonly keys = ASSET_CHANNEL_KEYS;
  readonly i18n = ASSET_CHANNEL_I18N;
}

/** "Not in gallery" / "Not in CLI" … tags for the channels an asset is switched off for. */
@Component({
  selector: 'app-asset-channel-tags',
  standalone: true,
  imports: [TranslateModule, NzTagModule],
  template: `
    @for (key of offKeys(); track key) {
      <nz-tag nzColor="orange">{{ 'ADMIN.COMMON.CHANNELS.NOT_' + i18n[key] | translate }}</nz-tag>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class AssetChannelTagsComponent {
  readonly asset = input.required<Partial<AssetChannelFlags>>();
  readonly i18n = ASSET_CHANNEL_I18N;
  readonly offKeys = computed(() => offChannelKeys(this.asset()));
}
