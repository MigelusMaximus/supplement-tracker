import { describe, expect, it } from 'vitest';
import { range } from './dates';
import { effectOf, summarize, verdict } from './effects';
import { restockNeed } from './inventory';
import { intakeId, type CheckIn, type Intake, type Supplement } from './types';

const base: Supplement = {
  id: 'mg', name: 'Magnesium', brand: '', tier: 'C', form: 'capsule', strength: '',
  doses: [{ slot: 'bedtime', units: 1 }], schedule: { kind: 'daily' }, withFood: false, notes: '', link: '', image: null,
  stock: { unitsLeft: 10, unitsPerContainer: 60, price: 12 }, startDate: '2026-10-01', archivedOn: null, createdAt: 0,
};
const take = (date: string): Intake => ({ id: intakeId(date, 'mg', 'bedtime'), supplementId: 'mg', date, slot: 'bedtime', units: 1, status: 'taken', at: 0 });
const ci = (date: string, r: CheckIn['ratings']): CheckIn => ({ date, ratings: r, note: '', at: 0 });

describe('effects', () => {
  it('prefers before vs after when there is history before starting', () => {
    const checkIns = [
      ...range('2026-09-20', '2026-09-30').map((d) => ci(d, { mood: 2 })),
      ...range('2026-10-01', '2026-10-10').map((d) => ci(d, { mood: 4 })),
    ];
    const e = effectOf(base, [], checkIns, '2026-10-10')!;
    expect(e.mode).toBe('beforeAfter');
    expect(e.rows).toHaveLength(1);
    expect(e.rows[0]).toMatchObject({ metric: 'mood', withAvg: 4, withoutAvg: 2, delta: 2 });
    expect(summarize(e)).toBe('Since you started: better mood.');
  });

  it('falls back to taken vs missed, matching sleep to the previous night', () => {
    const days = range('2026-10-01', '2026-10-20');
    const takenDays = days.filter((_, i) => i % 2 === 0); // every other night
    const intakes = takenDays.map(take);
    // Sleep is good the morning AFTER a dose.
    const checkIns = days.slice(1).map((d, i) => ci(d, { sleep: takenDays.includes(days[i]) ? 5 : 2, energy: 3 }));
    const e = effectOf(base, intakes, checkIns, '2026-10-20')!;
    expect(e.mode).toBe('takenVsMissed');
    const sleep = e.rows.find((r) => r.metric === 'sleep')!;
    expect(sleep.withAvg).toBe(5);
    expect(sleep.withoutAvg).toBe(2);
    expect(verdict(e.rows.find((r) => r.metric === 'energy')!)).toBe('same');
    expect(verdict(sleep)).toBe('better');
  });

  it('treats noisy differences as no change', () => {
    // +0.5 on average, but the ratings swing wildly, so it could easily be chance.
    expect(verdict({ delta: 0.5, se: 0.4 })).toBe('same');
    expect(verdict({ delta: 0.5, se: 0.2 })).toBe('better');
    expect(verdict({ delta: -0.2, se: 0 })).toBe('same');
    expect(verdict({ delta: -0.6, se: 0.1 })).toBe('worse');
  });

  it('returns null without enough data', () => {
    expect(effectOf(base, [take('2026-10-02')], [ci('2026-10-02', { mood: 3 })], '2026-10-05')).toBeNull();
  });
});

describe('restockNeed', () => {
  it('computes containers to cover a horizon', () => {
    expect(restockNeed(base, 2, '2026-11-01', 30)).toEqual({ containers: 1, cost: 12, runOutOn: '2026-11-06' });
    expect(restockNeed(base, 2, '2026-11-01', 90)).toMatchObject({ containers: 3, cost: 36 });
    expect(restockNeed(base, 0.1, '2026-11-01', 30)).toBeNull();
    expect(restockNeed({ ...base, stock: { ...base.stock, price: null } }, 2, '2026-11-01', 30)?.cost).toBeNull();
  });
});
