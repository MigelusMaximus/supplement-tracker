import { addDays, diffDays } from './dates';
import { frequency } from './schedule';
import type { DateKey, Intake, Supplement } from './types';

const DAYS_PER_MONTH = 365.25 / 12;

/** Units consumed per day on average according to the schedule. */
export function scheduledDailyUnits(s: Supplement): number {
  const perDay = s.doses.reduce((sum, d) => sum + d.units, 0);
  return perDay * frequency(s.schedule);
}

/**
 * Expected daily consumption. For as-needed supplements the schedule says nothing,
 * so fall back to what was actually taken over the last 30 days.
 */
export function dailyUnits(s: Supplement, intakes: Intake[], today: DateKey): number {
  if (s.schedule.kind !== 'asNeeded') return scheduledDailyUnits(s);
  const from = addDays(today, -29);
  const used = intakes
    .filter((i) => i.supplementId === s.id && i.status === 'taken' && i.date >= from && i.date <= today)
    .reduce((sum, i) => sum + i.units, 0);
  const window = Math.min(30, Math.max(1, diffDays(s.startDate, today) + 1));
  return used / window;
}

export function costPerUnit(s: Supplement): number | null {
  const { price, unitsPerContainer } = s.stock;
  if (price == null || !unitsPerContainer) return null;
  return price / unitsPerContainer;
}

export function monthlyCost(s: Supplement, daily: number): number | null {
  const cpu = costPerUnit(s);
  return cpu == null ? null : cpu * daily * DAYS_PER_MONTH;
}

export interface StockForecast {
  unitsLeft: number;
  /** Infinity when nothing is being consumed. */
  daysLeft: number;
  runOutOn: DateKey | null;
}

export function forecast(s: Supplement, daily: number, today: DateKey): StockForecast | null {
  if (s.stock.unitsLeft == null) return null;
  const unitsLeft = Math.max(0, s.stock.unitsLeft);
  if (daily <= 0) return { unitsLeft, daysLeft: Infinity, runOutOn: null };
  const daysLeft = Math.floor(unitsLeft / daily);
  return { unitsLeft, daysLeft, runOutOn: addDays(today, daysLeft) };
}

export type StockLevel = 'ok' | 'low' | 'out' | 'untracked';

export function stockLevel(f: StockForecast | null, lowDays: number): StockLevel {
  if (!f) return 'untracked';
  if (f.unitsLeft <= 0) return 'out';
  if (f.daysLeft < lowDays) return 'low';
  return 'ok';
}

export interface RestockNeed {
  containers: number;
  /** null when no price is known. */
  cost: number | null;
  runOutOn: DateKey;
}

/** Containers needed so stock lasts `horizon` more days. null = nothing to buy (or not tracked). */
export function restockNeed(s: Supplement, daily: number, today: DateKey, horizon: number): RestockNeed | null {
  const { unitsLeft, unitsPerContainer, price } = s.stock;
  if (unitsLeft == null || !unitsPerContainer || daily <= 0) return null;
  const left = Math.max(0, unitsLeft);
  const short = daily * horizon - left;
  if (short <= 0) return null;
  const containers = Math.ceil(short / unitsPerContainer);
  return { containers, cost: price == null ? null : containers * price, runOutOn: addDays(today, Math.floor(left / daily)) };
}
