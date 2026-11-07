import { addDays } from './dates';
import { isActiveOn, isScheduledOn } from './schedule';
import { METRICS, METRIC_ORDER, intakeId, type CheckIn, type DateKey, type Intake, type Metric, type Supplement } from './types';

/** Fewest rated days needed on each side before a comparison is shown. */
export const MIN_DAYS = 5;
/** Differences smaller than this (on a 1–5 scale) are treated as noise. */
export const NOISE = 0.3;
/** How far back "before you started" looks. */
const BEFORE_WINDOW = 60;

export interface EffectRow {
  metric: Metric;
  withAvg: number;
  withoutAvg: number;
  withN: number;
  withoutN: number;
  delta: number;
  /** Standard error of the difference: how much `delta` would wobble by chance alone. */
  se: number;
}

export interface Effect {
  mode: 'beforeAfter' | 'takenVsMissed';
  withLabel: string;
  withoutLabel: string;
  rows: EffectRow[];
}

/**
 * How you felt with vs without a supplement.
 *
 * Preferred: before vs since starting (works for slow-acting supplements).
 * Fallback: days it was taken vs days it was due but missed. Sleep is rated in the
 * morning about the night before, so it's matched against the previous day's intake.
 */
export function effectOf(s: Supplement, intakes: Intake[], checkIns: CheckIn[], today: DateKey): Effect | null {
  const end = s.archivedOn ?? addDays(today, 1);
  const logs = checkIns.filter((c) => c.date <= today);
  const before = logs.filter((c) => c.date < s.startDate && c.date >= addDays(s.startDate, -BEFORE_WINDOW));
  const after = logs.filter((c) => c.date >= s.startDate && c.date < end);

  const ba = METRIC_ORDER.map((m) => row(m, values(after, m), values(before, m))).filter(isRow);
  if (ba.length) return { mode: 'beforeAfter', withLabel: 'Since starting', withoutLabel: 'Before', rows: ba };

  const taken = new Set(intakes.filter((i) => i.supplementId === s.id && i.status === 'taken').map((i) => i.id));
  const asNeeded = s.schedule.kind === 'asNeeded';
  const relevant = (d: DateKey) => isActiveOn(s, d) && (asNeeded || isScheduledOn(s.schedule, d));
  const tookOn = (d: DateKey) =>
    asNeeded ? s.doses.some((x) => taken.has(intakeId(d, s.id, x.slot))) : s.doses.every((x) => taken.has(intakeId(d, s.id, x.slot)));

  const rows = METRIC_ORDER.map((m) => {
    const w: number[] = [];
    const wo: number[] = [];
    for (const c of after) {
      const v = c.ratings[m];
      const day = m === 'sleep' ? addDays(c.date, -1) : c.date;
      if (v == null || !relevant(day)) continue;
      (tookOn(day) ? w : wo).push(v);
    }
    return row(m, w, wo);
  }).filter(isRow);
  if (rows.length) return { mode: 'takenVsMissed', withLabel: 'Days taken', withoutLabel: 'Days missed', rows };
  return null;
}

const values = (cs: CheckIn[], m: Metric) => cs.map((c) => c.ratings[m]).filter((v): v is number => v != null);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const variance = (xs: number[], m: number) => xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1);
const isRow = (r: EffectRow | null): r is EffectRow => r !== null;

function row(metric: Metric, w: number[], wo: number[]): EffectRow | null {
  if (w.length < MIN_DAYS || wo.length < MIN_DAYS) return null;
  const withAvg = avg(w);
  const withoutAvg = avg(wo);
  const se = Math.sqrt(variance(w, withAvg) / w.length + variance(wo, withoutAvg) / wo.length);
  return { metric, withAvg, withoutAvg, withN: w.length, withoutN: wo.length, delta: withAvg - withoutAvg, se };
}

export type Verdict = 'better' | 'worse' | 'same';

/**
 * A difference only counts when it is both big enough to matter (≥ NOISE points)
 * and big enough not to be chance (≥ 2 standard errors, roughly 95%).
 */
export function verdict(r: Pick<EffectRow, 'delta' | 'se'>): Verdict {
  const size = Math.abs(r.delta);
  if (size < NOISE || size < 2 * r.se) return 'same';
  return r.delta > 0 ? 'better' : 'worse';
}

/** One-line plain-language summary. */
export function summarize(e: Effect): string {
  const list = (v: Verdict) =>
    e.rows.filter((r) => verdict(r) === v).map((r) => METRICS[r.metric].label.toLowerCase());
  const better = list('better');
  const worse = list('worse');
  if (!better.length && !worse.length) return 'No clear difference so far.';
  const join = (xs: string[]) => xs.join(' and ');
  const parts = [better.length && `better ${join(better)}`, worse.length && `worse ${join(worse)}`].filter(Boolean);
  return `${e.mode === 'beforeAfter' ? 'Since you started' : 'On days you take it'}: ${parts.join(', ')}.`;
}

/** Days needed before a verdict, for an encouraging empty state. */
export function ratedDaysSince(checkIns: CheckIn[], from: DateKey): number {
  return checkIns.filter((c) => c.date >= from && Object.keys(c.ratings).length > 0).length;
}
