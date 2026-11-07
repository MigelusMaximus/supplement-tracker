import { diffDays, weekday } from './dates';
import { SLOT_ORDER, type DateKey, type Dose, type Schedule, type Supplement } from './types';

/** Is the supplement part of the stack on this day (started, not yet archived)? */
export function isActiveOn(s: Supplement, day: DateKey): boolean {
  return s.startDate <= day && (s.archivedOn === null || day < s.archivedOn);
}

export function isScheduledOn(schedule: Schedule, day: DateKey): boolean {
  switch (schedule.kind) {
    case 'daily':
      return true;
    case 'weekly':
      return schedule.days.includes(weekday(day));
    case 'interval': {
      const d = diffDays(schedule.anchor, day);
      return d >= 0 && d % Math.max(1, schedule.every) === 0;
    }
    case 'asNeeded':
      return false;
  }
}

export interface DueDose extends Dose {
  supplement: Supplement;
  /** As-needed doses are shown but never count against adherence. */
  optional: boolean;
}

/** Every dose to show for a given day, ordered by slot then tier then name. */
export function dosesForDay(supplements: Supplement[], day: DateKey): DueDose[] {
  const out: DueDose[] = [];
  for (const s of supplements) {
    if (!isActiveOn(s, day)) continue;
    const optional = s.schedule.kind === 'asNeeded';
    if (!optional && !isScheduledOn(s.schedule, day)) continue;
    for (const d of s.doses) out.push({ ...d, supplement: s, optional });
  }
  return out.sort(
    (a, b) =>
      SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) ||
      a.supplement.tier.localeCompare(b.supplement.tier) ||
      a.supplement.name.localeCompare(b.supplement.name),
  );
}

/** Average fraction of days the schedule fires (asNeeded → 0). */
export function frequency(schedule: Schedule): number {
  switch (schedule.kind) {
    case 'daily':
      return 1;
    case 'weekly':
      return new Set(schedule.days).size / 7;
    case 'interval':
      return 1 / Math.max(1, schedule.every);
    case 'asNeeded':
      return 0;
  }
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeSchedule(schedule: Schedule): string {
  switch (schedule.kind) {
    case 'daily':
      return 'Every day';
    case 'weekly': {
      const days = [...new Set(schedule.days)].sort();
      if (days.length === 7) return 'Every day';
      if (days.join() === '1,2,3,4,5') return 'Weekdays';
      if (days.join() === '0,6') return 'Weekends';
      // Start the week on Monday for readability.
      return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => DAY_SHORT[d]).join(', ');
    }
    case 'interval':
      return schedule.every === 1 ? 'Every day' : `Every ${schedule.every} days`;
    case 'asNeeded':
      return 'As needed';
  }
}
