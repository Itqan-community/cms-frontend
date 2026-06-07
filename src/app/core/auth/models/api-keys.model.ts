/**
 * CMS API key management (`/api-keys/`) — normalized shapes for account UI.
 */

export interface ManagedApiKey {
  id: string;
  name: string;
  /** Masked or preview value shown in lists (never raw secret). */
  maskedKey: string;
  isRevoked: boolean;
  createdAt?: string;
  lastUsedAt?: string;
}

export interface ApiKeyCreateIn {
  name: string;
}

export interface ApiKeyPatchIn {
  name?: string;
  /** When true, server revokes the key (irreversible — confirm in UI). */
  revoked?: boolean;
}

export interface ApiKeyCreateResult {
  key: ManagedApiKey;
  /** Plain secret — only present on create response. */
  rawKey: string;
}
