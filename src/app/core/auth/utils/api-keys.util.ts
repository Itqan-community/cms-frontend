import type { ApiKeyCreateResult, ManagedApiKey } from '../models/api-keys.model';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const x = obj[k];
    if (typeof x === 'string' && x.trim()) {
      return x.trim();
    }
    if (typeof x === 'number') {
      return String(x).trim();
    }
  }
  return '';
}

function pickBool(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const k of keys) {
    const x = obj[k];
    if (typeof x === 'boolean') {
      return x;
    }
  }
  return undefined;
}

/** Derives revoked flag from common API representations. */
function deriveRevoked(o: Record<string, unknown>): boolean {
  const revokedFlag = pickBool(o, ['revoked', 'is_revoked', 'disabled']);
  if (revokedFlag === true) {
    return true;
  }

  const status = typeof o['status'] === 'string' ? String(o['status']).toLowerCase().trim() : '';
  if (status === 'revoked' || status === 'inactive' || status === 'disabled') {
    return true;
  }

  const active = pickBool(o, ['is_active', 'active']);
  if (active === false) {
    return true;
  }

  return false;
}

/**
 * Normalize a single API key row from list/detail/create (without raw secret extraction).
 */
export function normalizeApiKeyRow(raw: unknown): ManagedApiKey | null {
  const o = asRecord(raw);
  if (!o) {
    return null;
  }
  const id = pickStr(o, ['id', 'key_id', 'pk', 'uuid']);
  const name = pickStr(o, ['name', 'key_name', 'label', 'title']);
  if (!id || !name) {
    return null;
  }

  const maskedKey =
    pickStr(o, ['masked_key', 'key_masked', 'key_preview', 'prefix', 'key_prefix']) ||
    pickStr(o, ['masked', 'snippet']) ||
    '••••••••';

  const isRevoked = deriveRevoked(o);

  const createdAt = pickStr(o, ['created_at', 'created']) || undefined;
  const lastUsedAt = pickStr(o, ['last_used_at', 'last_used', 'last_seen_at']) || undefined;

  return {
    id,
    name,
    maskedKey,
    isRevoked,
    ...(createdAt ? { createdAt } : {}),
    ...(lastUsedAt ? { lastUsedAt } : {}),
  };
}

function extractListArray(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }
  const root = asRecord(body);
  if (!root) {
    return [];
  }
  const data = root['data'];
  if (Array.isArray(data)) {
    return data;
  }
  if (data !== null && typeof data === 'object') {
    const inner = asRecord(data);
    const keys = inner?.['api_keys'];
    const results = inner?.['results'];
    if (Array.isArray(keys)) {
      return keys;
    }
    if (Array.isArray(results)) {
      return results;
    }
  }
  const results = root['results'];
  if (Array.isArray(results)) {
    return results;
  }
  return [];
}

/** Parse GET /api-keys/ response body into display rows. */
export function parseApiKeysList(body: unknown): ManagedApiKey[] {
  const list = extractListArray(body);
  const out: ManagedApiKey[] = [];
  for (const row of list) {
    const n = normalizeApiKeyRow(row);
    if (n) {
      out.push(n);
    }
  }
  return out;
}

const RAW_SECRET_KEYS = [
  'raw_key',
  'key_plain',
  'secret',
  'token',
  'api_key',
  'value',
  'plaintext',
];

function extractRawSecret(o: Record<string, unknown>): string {
  for (const k of RAW_SECRET_KEYS) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

/** Parse POST /api-keys/ body: includes one-time plaintext plus key metadata. */
export function parseApiKeyCreated(body: unknown): ApiKeyCreateResult {
  const root = asRecord(body);
  const inner = root && root['data'] !== undefined ? asRecord(root['data']) : root;

  const obj = inner ?? {};
  let rawKey = extractRawSecret(obj);

  /** Some APIs nest the credential under `key`. */
  if (!rawKey) {
    const keyObj = asRecord(obj['key']);
    if (keyObj) {
      rawKey = extractRawSecret(keyObj);
    }
  }

  const keyRow = asRecord(obj['key']) ?? obj;

  const summary = normalizeApiKeyRow(keyRow);
  const key =
    summary ??
    ({
      id: pickStr(keyRow, ['id', 'key_id', 'pk', 'uuid']) || '',
      name: pickStr(keyRow, ['name', 'key_name', 'label']) || '',
      maskedKey: pickStr(keyRow, ['masked_key', 'key_preview']) || '••••••••',
      isRevoked: deriveRevoked(keyRow),
    } as ManagedApiKey);

  if (!rawKey && typeof obj['key'] === 'string') {
    rawKey = String(obj['key']).trim();
  }

  return { key, rawKey };
}
