import { db, newId } from './db';
import { addDays, range, todayKey } from './domain/dates';
import { dosesForDay } from './domain/schedule';
import { intakeId, type CheckIn, type Intake, type Supplement } from './domain/types';

type Draft = Omit<Supplement, 'id' | 'createdAt' | 'startDate' | 'archivedOn' | 'image' | 'notes' | 'link'> &
  Partial<Pick<Supplement, 'notes'>> & { startedDaysAgo?: number };

const EXAMPLES: Draft[] = [
  {
    name: 'Vitamin D3', brand: 'Example Labs', tier: 'S', form: 'softgel', strength: '2000 IU per softgel',
    doses: [{ slot: 'morning', units: 1 }], schedule: { kind: 'daily' }, withFood: true,
    stock: { unitsLeft: 74, unitsPerContainer: 120, price: 9.9 }, notes: 'Take with the fattiest meal.',
  },
  {
    name: 'Omega-3 fish oil', brand: 'Example Labs', tier: 'S', form: 'softgel', strength: '1000 mg EPA+DHA per 2 softgels',
    doses: [{ slot: 'morning', units: 2 }], schedule: { kind: 'daily' }, withFood: true,
    stock: { unitsLeft: 14, unitsPerContainer: 90, price: 24.5 },
  },
  {
    name: 'Creatine monohydrate', brand: '', tier: 'A', form: 'powder', strength: '5 g per scoop',
    doses: [{ slot: 'midday', units: 1 }], schedule: { kind: 'daily' }, withFood: false,
    stock: { unitsLeft: 63, unitsPerContainer: 100, price: 19 },
  },
  {
    name: 'Magnesium glycinate', brand: '', tier: 'A', form: 'capsule', strength: '100 mg elemental per capsule',
    doses: [{ slot: 'bedtime', units: 2 }], schedule: { kind: 'daily' }, withFood: false,
    stock: { unitsLeft: 112, unitsPerContainer: 180, price: 21 },
  },
  {
    name: 'Vitamin B12', brand: '', tier: 'B', form: 'tablet', strength: '1000 mcg',
    doses: [{ slot: 'morning', units: 1 }], schedule: { kind: 'weekly', days: [1, 3, 5] }, withFood: false,
    stock: { unitsLeft: 40, unitsPerContainer: 60, price: 7.5 },
  },
  {
    name: 'Ashwagandha', brand: '', tier: 'C', form: 'capsule', strength: '600 mg KSM-66',
    doses: [{ slot: 'evening', units: 1 }], schedule: { kind: 'weekly', days: [1, 2, 3, 4, 5] }, withFood: true,
    stock: { unitsLeft: 5, unitsPerContainer: 60, price: 16 }, notes: 'Trial — reassess after 8 weeks.', startedDaysAgo: 32,
  },
  {
    name: 'Melatonin', brand: '', tier: 'C', form: 'tablet', strength: '0.5 mg',
    doses: [{ slot: 'bedtime', units: 1 }], schedule: { kind: 'asNeeded' }, withFood: false,
    stock: { unitsLeft: 52, unitsPerContainer: 60, price: 5 }, notes: 'Only for jet lag or late nights.',
  },
];

/** Tiny deterministic PRNG so the demo history looks the same every time. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

export async function loadExampleStack() {
  const today = todayKey();
  const start = addDays(today, -62);
  const supplements: Supplement[] = EXAMPLES.map(({ startedDaysAgo, ...e }, i) => ({
    notes: '', link: '', image: null, ...e,
    id: newId(), startDate: startedDaysAgo ? addDays(today, -startedDaysAgo) : start, archivedOn: null, createdAt: Date.now() + i,
  }));

  const rand = rng(42);
  const intakes: Intake[] = [];
  for (const day of range(start, addDays(today, -1))) {
    const badDay = rand() < 0.08;
    for (const d of dosesForDay(supplements, day)) {
      // Lower tiers get forgotten more often — like real life.
      const miss = { S: 0.03, A: 0.08, B: 0.15, C: 0.22 }[d.supplement.tier];
      const r = rand();
      if (d.optional) {
        if (r > 0.12) continue;
      } else if (badDay || r < miss) {
        if (r < miss / 3) intakes.push(mk(d.supplement.id, day, d.slot, d.units, 'skipped'));
        continue;
      }
      intakes.push(mk(d.supplement.id, day, d.slot, d.units, 'taken'));
    }
  }
  // Check-ins with a couple of real patterns baked in, so "Is it working?" has something to find:
  // magnesium at bedtime → better sleep next morning; ashwagandha (started later) → better mood.
  const took = new Set(intakes.filter((i) => i.status === 'taken').map((i) => `${i.date}|${i.supplementId}`));
  const mg = supplements.find((s) => s.name.startsWith('Magnesium'))!;
  const ash = supplements.find((s) => s.name === 'Ashwagandha')!;
  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
  const checkIns: CheckIn[] = [];
  for (const day of range(start, addDays(today, -1))) {
    if (rand() < 0.18) continue; // some days you forget to check in
    const noise = () => (rand() - 0.5) * 2;
    const sleptWell = took.has(`${addDays(day, -1)}|${mg.id}`) ? 0.9 : -0.4;
    const calmer = day >= ash.startDate ? 0.8 : 0;
    checkIns.push({
      date: day,
      ratings: { sleep: clamp(3.2 + sleptWell + noise()), mood: clamp(3 + calmer + noise() * 0.9), energy: clamp(3.3 + sleptWell * 0.4 + noise()) },
      note: '',
      at: Date.now(),
    });
  }

  await db.transaction('rw', db.supplements, db.intakes, db.checkIns, async () => {
    await db.supplements.bulkPut(supplements);
    await db.intakes.bulkPut(intakes);
    await db.checkIns.bulkPut(checkIns);
  });
}

const mk = (supplementId: string, date: string, slot: Intake['slot'], units: number, status: Intake['status']): Intake => ({
  id: intakeId(date, supplementId, slot), supplementId, date, slot, units, status, at: Date.now(),
});
