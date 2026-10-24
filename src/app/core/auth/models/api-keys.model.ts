/**
 * CMS API key management (`/api-keys/`) — normalized shapes for account UI.
 */

export interface ManagedApiKey {
  id: string;
  name: string;
  /** Masked or preview value shown when the full key is not available. */
  maskedKey: string;
  /** Full key, when the API returns it. Keys are public app identifiers, so it can be shown and copied. */
  fullKey?: string;
  isRevoked: boolean;
  createdAt?: string;
  lastUsedAt?: string;
  /** Public slug appended to file URLs (`?c=`) so usage is attributed to this key's app. */
  appSlug?: string;
}

export interface ApiKeyCreateIn {
  name: string;
}

export interface ApiKeyPatchIn {
  name?: string;
  /** When true, server revokes the key (irreversible — confirm in UI). */
  revoked?: boolean;
  app_slug?: string;
}

export interface ApiKeyCreateResult {
  key: ManagedApiKey;
  /** Full key from the create response (empty if the API did not return it). */
  rawKey: string;
}
