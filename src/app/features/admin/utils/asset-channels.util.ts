import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NzModalService } from 'ng-zorro-antd/modal';

/** Distribution channels an asset can be turned on or off for. */
export const ASSET_CHANNEL_KEYS = ['in_gallery', 'in_public_api', 'in_cli', 'in_tenants'] as const;

export type AssetChannelKey = (typeof ASSET_CHANNEL_KEYS)[number];

export type AssetChannelFlags = Record<AssetChannelKey, boolean>;

/** Create/update payload part: the four flags plus the re-send acknowledgement. */
export interface AssetChannelFormFlags extends AssetChannelFlags {
  /** Re-sent with `true` after the admin confirms a 409 `channel_has_active_consumers`. */
  confirm_channel_change?: boolean;
}

/** i18n suffix under `ADMIN.COMMON.CHANNELS` for each flag. */
export const ASSET_CHANNEL_I18N: Record<AssetChannelKey, string> = {
  in_gallery: 'GALLERY',
  in_public_api: 'PUBLIC_API',
  in_cli: 'CLI',
  in_tenants: 'TENANTS',
};

/** Initial form values: every channel on. */
export const DEFAULT_CHANNEL_FLAGS: AssetChannelFlags = {
  in_gallery: true,
  in_public_api: true,
  in_cli: true,
  in_tenants: true,
};

/** Channels switched off on an asset (drives the "Not in …" tags). */
export function offChannelKeys(asset: Partial<AssetChannelFlags>): AssetChannelKey[] {
  return ASSET_CHANNEL_KEYS.filter((key) => asset[key] === false);
}

export function hasOffChannel(asset: Partial<AssetChannelFlags>): boolean {
  return offChannelKeys(asset).length > 0;
}

/** Body of the 409 returned when turning a channel off while developers still depend on it. */
export interface ChannelConsumersConflict {
  approved_count: number;
  pending_count: number;
  channels: string[];
}

/** Returns the conflict details when `error` is a 409 `channel_has_active_consumers`, else null. */
export function getChannelConsumersConflict(error: unknown): ChannelConsumersConflict | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
  const body = error.error as { error_name?: unknown; extra?: Partial<ChannelConsumersConflict> };
  if (body?.error_name !== 'channel_has_active_consumers') return null;
  const extra = body.extra ?? {};
  return {
    approved_count: Number(extra.approved_count ?? 0),
    pending_count: Number(extra.pending_count ?? 0),
    channels: Array.isArray(extra.channels) ? extra.channels : [],
  };
}

/** Asks the admin to confirm; `onConfirm` re-sends the request with `confirm_channel_change`. */
export function confirmChannelChange(
  modal: NzModalService,
  translate: TranslateService,
  conflict: ChannelConsumersConflict,
  onConfirm: () => void
): void {
  const separator = translate.currentLang === 'ar' ? '، ' : ', ';
  const channels = conflict.channels
    .map((flag) => {
      const suffix = ASSET_CHANNEL_I18N[flag as AssetChannelKey];
      return suffix ? translate.instant(`ADMIN.COMMON.CHANNELS.${suffix}`) : flag;
    })
    .join(separator);
  modal.confirm({
    nzTitle: translate.instant('ADMIN.COMMON.CHANNELS.CONFIRM_TITLE'),
    nzContent: translate.instant('ADMIN.COMMON.CHANNELS.CONFIRM_BODY', {
      approved: conflict.approved_count,
      pending: conflict.pending_count,
      channels,
    }),
    nzOkText: translate.instant('ADMIN.COMMON.CHANNELS.CONFIRM_OK'),
    nzCancelText: translate.instant('ADMIN.COMMON.CHANNELS.CONFIRM_CANCEL'),
    nzDirection: translate.currentLang === 'ar' ? 'rtl' : 'ltr',
    nzOnOk: onConfirm,
  });
}

/** Adds the channel flags (and the confirmation, when set) to a multipart payload. */
export function appendChannelFlags(data: FormData, payload: Partial<AssetChannelFormFlags>): void {
  for (const key of ASSET_CHANNEL_KEYS) {
    if (payload[key] !== undefined) data.append(key, String(payload[key]));
  }
  if (payload.confirm_channel_change) data.append('confirm_channel_change', 'true');
}
