import { describe, expect, it } from 'vitest';
import { bestStreak, currentStreak, dayStats, perSupplementRate } from './adherence';
import { addDays, diffDays, range, weekday } from './dates';
import { costPerUnit, dailyUnits, forecast, monthlyCost, stockLevel } from './inventory';
import { describeSchedule, dosesForDay, isScheduledOn } from './schedule';
import { intakeId, type Intake, type Supplement } from './types';

const supp = (over: Partial<Supplement> = {}): Supplement => ({
  id: 'd3',
  name: 'Vitamin D3',
  brand: '',
  tier: 'S',
  form: 'softgel',
  strength: '',
  doses: [{ slot: 'morning', units: 1 }],
  schedule: { kind: 'daily' },
  withFood: true,
  notes: '',
  link: '',
  image: null,
  stock: { unitsLeft: 30, unitsPerContainer: 120, price: 12 },
  startDate: '2026-01-01',
  archivedOn: null,
  createdAt: 0,
  ...over,
});

const take = (s: Supplement, date: string, slot = s.doses[0].slot, status: Intake['status'] = 'taken'): Intake => ({
  id: intakeId(date, s.id, slot),
  supplementId: s.id,
  date,
  slot,
  units: 1,
  status,
  at: 0,
});

describe('dates', () => {
  it('handles month/year/DST boundaries', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(range('2026-01-30', '2026-02-02')).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
    expect(weekday('2026-11-03')).toBe(2); // Tuesday
  });
});

describe('schedule', () => {
  it('weekly and interval schedules', () => {
    expect(isScheduledOn({ kind: 'weekly', days: [1, 3] }, '2026-11-02')).toBe(true); // Mon
    expect(isScheduledOn({ kind: 'weekly', days: [1, 3] }, '2026-11-03')).toBe(false);
    const every3 = { kind: 'interval', every: 3, anchor: '2026-11-01' } as const;
    expect(['2026-10-29', '2026-11-01', '2026-11-02', '2026-11-04'].map((d) => isScheduledOn(every3, d))).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  it('respects start and archive dates and marks as-needed optional', () => {
    const a = supp({ startDate: '2026-11-02', archivedOn: '2026-11-05' });
    expect(dosesForDay([a], '2026-11-01')).toHaveLength(0);
    expect(dosesForDay([a], '2026-11-04')).toHaveLength(1);
    expect(dosesForDay([a], '2026-11-05')).toHaveLength(0);
    const p = supp({ id: 'p', schedule: { kind: 'asNeeded' } });
    expect(dosesForDay([p], '2026-11-04')[0].optional).toBe(true);
  });

  it('describes schedules', () => {
    expect(describeSchedule({ kind: 'weekly', days: [5, 4, 3, 2, 1] })).toBe('Weekdays');
    expect(describeSchedule({ kind: 'weekly', days: [0, 1] })).toBe('Mon, Sun');
  });
});

describe('inventory', () => {
  it('computes cost and run-out', () => {
    const s = supp({ doses: [{ slot: 'morning', units: 2 }], schedule: { kind: 'weekly', days: [1, 2, 3, 4, 5, 6, 0] } });
    expect(costPerUnit(s)).toBeCloseTo(0.1);
    const daily = dailyUnits(s, [], '2026-11-03');
    expect(daily).toBe(2);
    expect(monthlyCost(s, daily)).toBeCloseTo(6.0875);
    const f = forecast(s, daily, '2026-11-03')!;
    expect(f.daysLeft).toBe(15);
    expect(f.runOutOn).toBe('2026-11-18');
    expect(stockLevel(f, 10)).toBe('ok');
    expect(stockLevel(f, 20)).toBe('low');
    expect(stockLevel(forecast(supp({ stock: { unitsLeft: 0, unitsPerContainer: 1, price: 1 } }), 1, '2026-11-03'), 5)).toBe('out');
    expect(forecast(supp({ stock: { unitsLeft: null, unitsPerContainer: null, price: null } }), 1, '2026-11-03')).toBeNull();
  });

  it('uses real usage for as-needed', () => {
    const s = supp({ schedule: { kind: 'asNeeded' }, startDate: '2026-01-01' });
    const intakes = ['2026-11-01', '2026-11-02', '2026-11-03'].map((d) => take(s, d));
    expect(dailyUnits(s, intakes, '2026-11-03')).toBeCloseTo(3 / 30);
  });
});

describe('adherence', () => {
  const a = supp({ startDate: '2026-10-28' });
  const b = supp({ id: 'mg', name: 'Magnesium', doses: [{ slot: 'bedtime', units: 1 }], startDate: '2026-10-28' });

  it('counts streaks; unfinished today does not break it', () => {
    const intakes = range('2026-10-30', '2026-11-02').flatMap((d) => [take(a, d), take(b, d)]);
    intakes.push(take(a, '2026-11-03')); // today half done
    expect(currentStreak([a, b], intakes, '2026-11-03')).toBe(4);
    intakes.push(take(b, '2026-11-03'));
    expect(currentStreak([a, b], intakes, '2026-11-03')).toBe(5);
    const stats = dayStats([a, b], intakes, '2026-10-28', '2026-11-03');
    expect(bestStreak(stats)).toBe(5);
  });

  it('skips do not count as taken', () => {
    const intakes = [take(a, '2026-11-01'), take(b, '2026-11-01', 'bedtime', 'skipped')];
    const [s] = dayStats([a, b], intakes, '2026-11-01', '2026-11-01');
    expect(s).toMatchObject({ expected: 2, taken: 1, skipped: 1 });
    const rates = perSupplementRate([a, b], intakes, '2026-11-01', '2026-11-01');
    expect(rates.map((r) => [r.supplement.id, r.rate])).toEqual([
      ['mg', 0],
      ['d3', 1],
    ]);
  });
});
