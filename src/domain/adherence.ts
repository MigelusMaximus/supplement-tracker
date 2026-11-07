import { addDays, range } from './dates';
import { dosesForDay } from './schedule';
import { intakeId, type DateKey, type Intake, type Supplement } from './types';

export interface DayStat {
  date: DateKey;
  expected: number;
  taken: number;
  skipped: number;
}

export const intakeIndex = (intakes: Intake[]) => new Map(intakes.map((i) => [i.id, i]));

export function dayStat(supplements: Supplement[], index: Map<string, Intake>, date: DateKey): DayStat {
  let expected = 0,
    taken = 0,
    skipped = 0;
  for (const d of dosesForDay(supplements, date)) {
    if (d.optional) continue;
    expected++;
    const status = index.get(intakeId(date, d.supplement.id, d.slot))?.status;
    if (status === 'taken') taken++;
    else if (status === 'skipped') skipped++;
  }
  return { date, expected, taken, skipped };
}

export function dayStats(supplements: Supplement[], intakes: Intake[], from: DateKey, to: DateKey): DayStat[] {
  const index = intakeIndex(intakes);
  return range(from, to).map((d) => dayStat(supplements, index, d));
}

export const isComplete = (s: DayStat) => s.expected > 0 && s.taken === s.expected;

/** Overall share of scheduled doses taken. null when nothing was due. */
export function adherenceRate(stats: DayStat[]): number | null {
  const expected = stats.reduce((n, s) => n + s.expected, 0);
  if (!expected) return null;
  return stats.reduce((n, s) => n + s.taken, 0) / expected;
}

/**
 * Consecutive fully-completed days ending today. Today only counts once it is
 * complete — an unfinished today doesn't break the streak. Days with nothing
 * scheduled are neutral.
 */
export function currentStreak(supplements: Supplement[], intakes: Intake[], today: DateKey, maxDays = 3650): number {
  const index = intakeIndex(intakes);
  let streak = 0;
  for (let i = 0, day = today; i < maxDays; i++, day = addDays(day, -1)) {
    const s = dayStat(supplements, index, day);
    if (s.expected === 0) {
      if (!supplements.some((x) => x.startDate <= day)) break; // before history began
      continue;
    }
    if (isComplete(s)) streak++;
    else if (day !== today) break;
  }
  return streak;
}

export function bestStreak(stats: DayStat[]): number {
  let best = 0,
    run = 0;
  for (const s of stats) {
    if (s.expected === 0) continue;
    run = isComplete(s) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Per-supplement adherence over a window, ignoring as-needed items. */
export function perSupplementRate(
  supplements: Supplement[],
  intakes: Intake[],
  from: DateKey,
  to: DateKey,
): { supplement: Supplement; expected: number; taken: number; rate: number }[] {
  const index = intakeIndex(intakes);
  const acc = new Map<string, { expected: number; taken: number }>();
  for (const day of range(from, to)) {
    for (const d of dosesForDay(supplements, day)) {
      if (d.optional) continue;
      const a = acc.get(d.supplement.id) ?? { expected: 0, taken: 0 };
      a.expected++;
      if (index.get(intakeId(day, d.supplement.id, d.slot))?.status === 'taken') a.taken++;
      acc.set(d.supplement.id, a);
    }
  }
  return supplements
    .filter((s) => acc.has(s.id))
    .map((s) => {
      const a = acc.get(s.id)!;
      return { supplement: s, ...a, rate: a.taken / a.expected };
    })
    .sort((a, b) => a.rate - b.rate || a.supplement.name.localeCompare(b.supplement.name));
}
