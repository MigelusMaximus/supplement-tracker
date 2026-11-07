/** Local calendar day, `YYYY-MM-DD`. Never a timestamp — avoids timezone drift. */
export type DateKey = string;

export type Tier = 'S' | 'A' | 'B' | 'C';

export const TIERS: Record<Tier, { label: string; hint: string }> = {
  S: { label: 'Essential', hint: 'Core of the stack. Never skip.' },
  A: { label: 'Important', hint: 'Clear benefit for you.' },
  B: { label: 'Beneficial', hint: 'Nice to have, first to cut.' },
  C: { label: 'Experimental', hint: 'Trying it out. Evaluate soon.' },
};
export const TIER_ORDER: Tier[] = ['S', 'A', 'B', 'C'];

export type Slot = 'morning' | 'midday' | 'evening' | 'bedtime';
export const SLOTS: Record<Slot, string> = {
  morning: 'Morning',
  midday: 'Midday',
  evening: 'Evening',
  bedtime: 'Bedtime',
};
export const SLOT_ORDER: Slot[] = ['morning', 'midday', 'evening', 'bedtime'];

export type Form = 'capsule' | 'tablet' | 'softgel' | 'powder' | 'liquid' | 'gummy' | 'drops' | 'other';

/** Unit name for one "unit" of a given form — what gets counted in inventory. */
export const FORM_UNIT: Record<Form, [singular: string, plural: string]> = {
  capsule: ['capsule', 'capsules'],
  tablet: ['tablet', 'tablets'],
  softgel: ['softgel', 'softgels'],
  powder: ['scoop', 'scoops'],
  liquid: ['ml', 'ml'],
  gummy: ['gummy', 'gummies'],
  drops: ['drop', 'drops'],
  other: ['serving', 'servings'],
};

export type Schedule =
  | { kind: 'daily' }
  /** 0 = Sunday … 6 = Saturday */
  | { kind: 'weekly'; days: number[] }
  /** Every N days counting from `anchor`. */
  | { kind: 'interval'; every: number; anchor: DateKey }
  | { kind: 'asNeeded' };

export interface Dose {
  slot: Slot;
  /** How many units (capsules, scoops…) per dose. */
  units: number;
}

export interface Stock {
  /** Units on hand. null = not tracking inventory. */
  unitsLeft: number | null;
  unitsPerContainer: number | null;
  /** Price of one container in the user's currency. */
  price: number | null;
}

export interface Supplement {
  id: string;
  name: string;
  brand: string;
  tier: Tier;
  form: Form;
  /** Free text, e.g. "5000 IU per softgel". */
  strength: string;
  doses: Dose[];
  schedule: Schedule;
  withFood: boolean;
  notes: string;
  link: string;
  /** Small data-URL thumbnail. */
  image: string | null;
  stock: Stock;
  /** First day it counts towards adherence. */
  startDate: DateKey;
  /** Day it stopped counting (exclusive). null = active. */
  archivedOn: DateKey | null;
  createdAt: number;
}

export type IntakeStatus = 'taken' | 'skipped';

export interface Intake {
  /** `${date}|${supplementId}|${slot}` — one record per scheduled dose. */
  id: string;
  supplementId: string;
  date: DateKey;
  slot: Slot;
  units: number;
  status: IntakeStatus;
  at: number;
}

export type Metric = 'energy' | 'mood' | 'sleep';
export const METRIC_ORDER: Metric[] = ['energy', 'mood', 'sleep'];
export const METRICS: Record<Metric, { label: string; question: string; low: string; high: string }> = {
  energy: { label: 'Energy', question: 'Energy today', low: 'Drained', high: 'Energised' },
  mood: { label: 'Mood', question: 'Mood today', low: 'Low', high: 'Great' },
  sleep: { label: 'Sleep', question: 'Last night’s sleep', low: 'Poor', high: 'Excellent' },
};

/** How you felt on a day. Ratings are 1–5; any may be missing. */
export interface CheckIn {
  date: DateKey;
  ratings: Partial<Record<Metric, number>>;
  note: string;
  at: number;
}

export interface Settings {
  currency: string;
  theme: 'system' | 'light' | 'dark';
  /** Warn when stock covers fewer than this many days. */
  lowStockDays: number;
  /** Show the daily how-do-you-feel card on Today. */
  checkIns: boolean;
  lastBackupAt: number | null;
  /** Don't nag about backups before this time. */
  backupNudgeAfter: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'EUR',
  theme: 'system',
  lowStockDays: 10,
  checkIns: true,
  lastBackupAt: null,
  backupNudgeAfter: null,
};

export const intakeId = (date: DateKey, supplementId: string, slot: Slot) =>
  `${date}|${supplementId}|${slot}`;
