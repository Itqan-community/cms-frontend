/**
 * Display formatting for timestamp values.
 *
 * The editor always shows milliseconds, because milliseconds are what is being edited —
 * a boundary reading `00:03:21` would hide the very digits an admin came here to change.
 */

const EM_DASH = '—';

/** `hh:mm:ss.mmm`, or an em dash when there is no value to show. */
export function formatTimestamp(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return EM_DASH;

  const safe = Math.max(0, Math.round(ms));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor(safe / 60_000) % 60;
  const seconds = Math.floor(safe / 1_000) % 60;
  const millis = safe % 1_000;

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}`;
}

/** Signed millisecond offset, e.g. `+120 ms` — how far a marker has moved since loading. */
export function formatDrift(ms: number): string {
  return `${withSign(ms)} ms`;
}

/** Signed step for a nudge control, e.g. `-100`. */
export function formatNudgeStep(ms: number): string {
  return withSign(ms);
}

function withSign(ms: number): string {
  return ms > 0 ? `+${ms}` : String(ms);
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}
