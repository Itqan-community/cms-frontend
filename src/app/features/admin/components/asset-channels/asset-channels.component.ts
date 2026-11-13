import { Component, computed, inject, input } from '@angular/core';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AdminTenantService } from '../../services/admin-tenant.service';
import {
  ASSET_CHANNEL_I18N,
  ASSET_CHANNEL_KEYS,
  AssetChannelFlags,
  AssetChannelKey,
  offChannelKeys,
} from '../../utils/asset-channels.util';

/** Every channel except "Publisher website", for publishers without a website through Fanar. */
const CHANNEL_KEYS_WITHOUT_WEBSITE: readonly AssetChannelKey[] = ASSET_CHANNEL_KEYS.filter(
  (key) => key !== 'in_tenants'
);

/**
 * "Distribution channels" checkboxes; sits inside an asset form that has the four flag controls
 * and a `publisher_id` control. "Publisher website" (`in_tenants`) is offered only when that
 * publisher has a website through Fanar; while hidden its control keeps the loaded (or default)
 * value, so saving never changes it.
 */
@Component({
  selector: 'app-asset-channels-fields',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, NzCheckboxModule, NzFormModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  template: `
    <nz-form-item>
      <nz-form-label>{{ 'ADMIN.COMMON.CHANNELS.TITLE' | translate }}</nz-form-label>
      <nz-form-control [nzExtra]="'ADMIN.COMMON.CHANNELS.HELP' | translate">
        @for (key of keys(); track key) {
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
  private readonly container = inject(ControlContainer);
  private readonly tenantService = inject(AdminTenantService);
  readonly i18n = ASSET_CHANNEL_I18N;

  /** Read on each change detection: the form sets `publisher_id` on create and after loading. */
  keys(): readonly AssetChannelKey[] {
    const publisherId = this.container.control?.get('publisher_id')?.value;
    const hasWebsite = this.tenantService
      .publishers()
      .some((publisher) => publisher.id === publisherId && publisher.has_website);
    return hasWebsite ? ASSET_CHANNEL_KEYS : CHANNEL_KEYS_WITHOUT_WEBSITE;
  }
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
