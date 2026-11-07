import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { blankSupplement, db, deleteSupplement, exportBackup, getSettings, importBackup, restock, saveSupplement, setCheckIn, setDose, wipeAll } from './db';

const D = '2026-11-03';

async function make() {
  const s = { ...blankSupplement(D), name: 'Omega-3', stock: { unitsLeft: 10, unitsPerContainer: 90, price: 20 } };
  await saveSupplement(s);
  return s;
}
const left = async (id: string) => (await db.supplements.get(id))!.stock.unitsLeft;

describe('db', () => {
  beforeEach(() => wipeAll());

  it('keeps inventory in sync with taking, undoing and skipping', async () => {
    const s = await make();
    await setDose(s.id, D, 'morning', 2, 'taken');
    expect(await left(s.id)).toBe(8);
    await setDose(s.id, D, 'morning', 2, 'taken'); // idempotent
    expect(await left(s.id)).toBe(8);
    await setDose(s.id, D, 'morning', 2, 'skipped'); // taken → skipped gives units back
    expect(await left(s.id)).toBe(10);
    await setDose(s.id, D, 'morning', 2, 'taken');
    await setDose(s.id, D, 'morning', 2, null);
    expect(await left(s.id)).toBe(10);
    expect(await db.intakes.count()).toBe(0);
  });

  it('restocks from zero and deletes cascade', async () => {
    const s = await make();
    await db.supplements.update(s.id, { stock: { ...s.stock, unitsLeft: -1 } });
    await restock(s.id);
    expect(await left(s.id)).toBe(90);
    await setDose(s.id, D, 'morning', 1, 'taken');
    await deleteSupplement(s.id);
    expect(await db.intakes.count()).toBe(0);
  });

  it('round-trips a backup and rejects foreign files', async () => {
    const s = await make();
    await setDose(s.id, D, 'morning', 1, 'taken');
    await setCheckIn(D, { ratings: { mood: 4 } });
    const backup = JSON.parse(JSON.stringify(await exportBackup()));
    await wipeAll();
    await importBackup(backup);
    expect(await db.supplements.count()).toBe(1);
    expect(await db.intakes.count()).toBe(1);
    expect((await db.checkIns.get(D))?.ratings.mood).toBe(4);
    expect((await getSettings()).lastBackupAt).toBeTypeOf('number');
    await expect(importBackup({ hello: 1 })).rejects.toThrow(/not a Supplement Tracker backup/);
    expect(await db.supplements.count()).toBe(1);
  });

  it('removes a check-in when it is cleared, and imports v1 backups', async () => {
    await setCheckIn(D, { ratings: { sleep: 2 } });
    await setCheckIn(D, { note: 'tired' });
    expect(await db.checkIns.get(D)).toMatchObject({ ratings: { sleep: 2 }, note: 'tired' });
    await setCheckIn(D, { ratings: {}, note: '' });
    expect(await db.checkIns.count()).toBe(0);
    await importBackup({ app: 'supplement-tracker', version: 1, supplements: [], intakes: [] });
    expect(await db.checkIns.count()).toBe(0);
  });
});
