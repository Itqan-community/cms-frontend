/**
 * Normalize django-allauth headless envelopes for account management UIs.
 * Backend shape can vary slightly by version — keep parsers defensive.
 */

export interface ManagedEmailAddress {
  email: string;
  verified: boolean;
  primary: boolean;
}

export interface ManagedSession {
  id: string;
  ip?: string;
  user_agent?: string;
  created_at?: string;
  last_seen_at?: string;
  /** When API marks the row as current browser session */
  is_current?: boolean;
}

export interface ConnectedProviderAccountRow {
  /** Provider id for disconnect API */
  providerId: string;
  /** Account uid for disconnect API */
  accountUid: string;
  /** Display label */
  label: string;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const x = obj[k];
    if (typeof x === 'string' && x.trim()) {
      return x.trim();
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

/** Parse one email row from API list items. */
export function normalizeEmailRow(raw: unknown): ManagedEmailAddress | null {
  const o = asRecord(raw);
  if (!o) {
    return null;
  }
  const email = pickStr(o, ['email']);
  if (!email) {
    return null;
  }
  const verified = pickBool(o, ['verified', 'Verified']) ?? false;
  const primary = pickBool(o, ['primary', 'Primary']) ?? false;
  return { email, verified, primary };
}

/** `GET /account/email` — `data` may be an array or an object wrapping emails. */
export function parseEmailAddressesEnvelope(body: unknown): ManagedEmailAddress[] {
  const root = asRecord(body);
  if (!root) {
    return [];
  }
  const data = root['data'];
  let list: unknown[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data !== null && typeof data === 'object') {
    const inner = asRecord(data);
    const emails = inner?.['emails'];
    const addresses = inner?.['email_addresses'];
    if (Array.isArray(emails)) {
      list = emails;
    } else if (Array.isArray(addresses)) {
      list = addresses;
    }
  }
  const out: ManagedEmailAddress[] = [];
  for (const row of list) {
    const n = normalizeEmailRow(row);
    if (n) {
      out.push(n);
    }
  }
  return out;
}

function normalizeSessionRow(raw: unknown): ManagedSession | null {
  const o = asRecord(raw);
  if (!o) {
    return null;
  }
  const id = pickStr(o, ['id', 'session_key', 'key', 'pk']);
  if (!id) {
    return null;
  }
  return {
    id,
    ip: pickStr(o, ['ip', 'ip_address', 'remote_addr']) || undefined,
    user_agent: pickStr(o, ['user_agent', 'useragent']) || undefined,
    created_at: pickStr(o, ['created_at', 'created']) || undefined,
    last_seen_at: pickStr(o, ['last_seen_at', 'last_seen', 'updated_at']) || undefined,
    is_current:
      pickBool(o, ['is_current', 'current']) ??
      (typeof o['flags'] === 'object' && o['flags'] !== null
        ? pickBool(asRecord(o['flags']) ?? {}, ['current'])
        : undefined),
  };
}

/** `GET /auth/sessions` */
export function parseSessionsEnvelope(body: unknown): ManagedSession[] {
  const root = asRecord(body);
  if (!root) {
    return [];
  }
  const data = root['data'];
  let list: unknown[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data !== null && typeof data === 'object') {
    const inner = asRecord(data);
    const sessions = inner?.['sessions'];
    if (Array.isArray(sessions)) {
      list = sessions;
    }
  }
  const out: ManagedSession[] = [];
  for (const row of list) {
    const n = normalizeSessionRow(row);
    if (n) {
      out.push(n);
    }
  }
  return out;
}

/** `GET /account/providers` */
export function parseProviderAccountsEnvelope(body: unknown): ConnectedProviderAccountRow[] {
  const root = asRecord(body);
  if (!root) {
    return [];
  }
  const data = root['data'];
  let list: unknown[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data !== null && typeof data === 'object') {
    const inner = asRecord(data);
    const accounts = inner?.['accounts'];
    if (Array.isArray(accounts)) {
      list = accounts;
    }
  }
  const out: ConnectedProviderAccountRow[] = [];
  for (const row of list) {
    const o = asRecord(row);
    if (!o) {
      continue;
    }
    const providerObj = asRecord(o['provider']);
    const providerId =
      providerObj !== null
        ? pickStr(providerObj, ['id', 'provider_id', 'client_id'])
        : pickStr(o, ['provider', 'provider_id']);
    const accountUid = pickStr(o, ['uid', 'account', 'account_uid', 'id']);
    if (!providerId || !accountUid) {
      continue;
    }
    const name = providerObj !== null ? pickStr(providerObj, ['name', 'id']) : providerId;
    const label = `${name} · ${accountUid}`;
    out.push({ providerId, accountUid, label });
  }
  return out;
}
