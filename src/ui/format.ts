import { FORM_UNIT, type Form } from '../domain/types';

export function money(value: number, currency: string, compact = false): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: compact || value >= 100 ? 0 : 2,
      minimumFractionDigits: compact || value >= 100 ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function units(n: number, form: Form): string {
  const [one, many] = FORM_UNIT[form];
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${v} ${n === 1 ? one : many}`;
}

export const pct = (r: number | null) => (r == null ? '—' : `${Math.round(r * 100)}%`);

export function daysLabel(days: number): string {
  if (!Number.isFinite(days)) return 'not in use';
  if (days === 0) return 'runs out today';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} left`;
  if (days < 60) return `${Math.round(days / 7)} weeks left`;
  return `${Math.round(days / 30.4)} months left`;
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
