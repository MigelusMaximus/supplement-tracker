import type { DateKey } from './types';

// All arithmetic happens on UTC midnights derived from the key, so DST never shifts a day.

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayKey = (): DateKey => toKey(new Date());

function toUtc(key: DateKey): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): DateKey {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const DAY = 86_400_000;

export const addDays = (key: DateKey, n: number): DateKey => fromUtc(toUtc(key) + n * DAY);

/** b − a in whole days. */
export const diffDays = (a: DateKey, b: DateKey): number => Math.round((toUtc(b) - toUtc(a)) / DAY);

/** 0 = Sunday … 6 = Saturday */
export const weekday = (key: DateKey): number => new Date(toUtc(key)).getUTCDay();

/** Inclusive range of day keys. */
export function range(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

/** Local Date at noon for display formatting. */
export const keyToDate = (key: DateKey): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export function formatDay(key: DateKey, opts: Intl.DateTimeFormatOptions): string {
  return keyToDate(key).toLocaleDateString(undefined, opts);
}

export function relativeDayLabel(key: DateKey, today: DateKey = todayKey()): string | null {
  const d = diffDays(today, key);
  if (d === 0) return 'Today';
  if (d === -1) return 'Yesterday';
  if (d === 1) return 'Tomorrow';
  return null;
}
