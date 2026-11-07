import Dexie, { type EntityTable } from 'dexie';
import { addDays, todayKey } from './domain/dates';
import {
  DEFAULT_SETTINGS,
  intakeId,
  type CheckIn,
  type DateKey,
  type Intake,
  type IntakeStatus,
  type Settings,
  type Slot,
  type Supplement,
} from './domain/types';

interface SettingRow {
  key: 'settings';
  value: Settings;
}

export const db = new Dexie('supplement-tracker') as Dexie & {
  supplements: EntityTable<Supplement, 'id'>;
  intakes: EntityTable<Intake, 'id'>;
  checkIns: EntityTable<CheckIn, 'date'>;
  meta: EntityTable<SettingRow, 'key'>;
};

db.version(1).stores({
  supplements: 'id, tier, archivedOn',
  intakes: 'id, date, supplementId, [supplementId+date]',
  meta: 'key',
});
db.version(2).stores({ checkIns: 'date' });

/** Ask the browser not to evict our data under storage pressure. */
async function persist() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* best effort */
  }
}

export const newId = () => crypto.randomUUID();

export function blankSupplement(today: string): Supplement {
  return {
    id: newId(),
    name: '',
    brand: '',
    tier: 'A',
    form: 'capsule',
    strength: '',
    doses: [{ slot: 'morning', units: 1 }],
    schedule: { kind: 'daily' },
    withFood: false,
    notes: '',
    link: '',
    image: null,
    stock: { unitsLeft: null, unitsPerContainer: null, price: null },
    startDate: today,
    archivedOn: null,
    createdAt: Date.now(),
  };
}


// ---------- settings ----------

export async function getSettings(): Promise<Settings> {
  const row = await db.meta.get('settings');
  return { ...DEFAULT_SETTINGS, ...guessCurrency(), ...row?.value };
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  await db.meta.put({ key: 'settings', value: { ...current, ...patch } });
}

function guessCurrency(): Partial<Settings> {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    const map: Record<string, string> = { CZ: 'CZK', US: 'USD', GB: 'GBP', PL: 'PLN', CH: 'CHF', CA: 'CAD', AU: 'AUD', JP: 'JPY', SE: 'SEK', NO: 'NOK', DK: 'DKK', HU: 'HUF' };
    return region && map[region] ? { currency: map[region] } : {};
  } catch {
    return {};
  }
}

// ---------- supplements ----------

export async function saveSupplement(s: Supplement) {
  await db.supplements.put(s);
  void persist();
}

export async function archiveSupplement(id: string, archived: boolean) {
  // Archiving today means today still counts; it stops from tomorrow on.
  const day = todayKey();
  await db.supplements.update(id, { archivedOn: archived ? addDays(day, 1) : null });
}


export async function deleteSupplement(id: string) {
  await db.transaction('rw', db.supplements, db.intakes, async () => {
    await db.intakes.where('supplementId').equals(id).delete();
    await db.supplements.delete(id);
  });
}

/** Add (or with a negative count, take back) whole containers. */
export async function restock(id: string, containers = 1) {
  await db.transaction('rw', db.supplements, async () => {
    const s = await db.supplements.get(id);
    if (!s || !s.stock.unitsPerContainer) return;
    const left = Math.max(0, s.stock.unitsLeft ?? 0);
    await db.supplements.update(id, { stock: { ...s.stock, unitsLeft: Math.max(0, left + containers * s.stock.unitsPerContainer) } });
  });
}

// ---------- intakes ----------

/**
 * Set (or clear, with `status = null`) the state of one scheduled dose. Inventory is
 * kept in sync in the same transaction: taking consumes units, undoing gives them back.
 */
export async function setDose(supplementId: string, date: DateKey, slot: Slot, units: number, status: IntakeStatus | null) {
  const id = intakeId(date, supplementId, slot);
  await db.transaction('rw', db.supplements, db.intakes, async () => {
    const [prev, s] = await Promise.all([db.intakes.get(id), db.supplements.get(supplementId)]);
    if (!s) return;
    let delta = 0;
    if (prev?.status === 'taken') delta += prev.units;
    if (status === 'taken') delta -= units;

    if (status) await db.intakes.put({ id, supplementId, date, slot, units, status, at: Date.now() });
    else await db.intakes.delete(id);

    if (delta && s.stock.unitsLeft != null) {
      await db.supplements.update(supplementId, { stock: { ...s.stock, unitsLeft: s.stock.unitsLeft + delta } });
    }
  });
  void persist();
}

// ---------- check-ins ----------

export async function setCheckIn(date: DateKey, patch: Partial<Pick<CheckIn, 'ratings' | 'note'>>) {
  await db.transaction('rw', db.checkIns, async () => {
    const prev = await db.checkIns.get(date);
    const next: CheckIn = { date, ratings: {}, note: '', ...prev, ...patch, at: Date.now() };
    if (!Object.keys(next.ratings).length && !next.note.trim()) await db.checkIns.delete(date);
    else await db.checkIns.put(next);
  });
  void persist();
}

// ---------- backup ----------

export interface Backup {
  app: 'supplement-tracker';
  version: 2;
  exportedAt: string;
  settings: Settings;
  supplements: Supplement[];
  intakes: Intake[];
  checkIns: CheckIn[];
}

export async function exportBackup(): Promise<Backup> {
  const [settings, supplements, intakes, checkIns] = await Promise.all([
    getSettings(),
    db.supplements.toArray(),
    db.intakes.toArray(),
    db.checkIns.toArray(),
  ]);
  await updateSettings({ lastBackupAt: Date.now() });
  return { app: 'supplement-tracker', version: 2, exportedAt: new Date().toISOString(), settings, supplements, intakes, checkIns };
}

export async function importBackup(raw: unknown) {
  const b = raw as Partial<Backup>;
  if (b?.app !== 'supplement-tracker' || !Array.isArray(b.supplements) || !Array.isArray(b.intakes)) {
    throw new Error('This file is not a Supplement Tracker backup.');
  }
  await db.transaction('rw', [db.supplements, db.intakes, db.checkIns, db.meta], async () => {
    await Promise.all([db.supplements.clear(), db.intakes.clear(), db.checkIns.clear()]);
    await db.supplements.bulkPut(b.supplements!);
    await db.intakes.bulkPut(b.intakes!);
    await db.checkIns.bulkPut(Array.isArray(b.checkIns) ? b.checkIns : []); // v1 backups have none
    // The device now holds exactly this backup, so it counts as backed up as of its date.
    const lastBackupAt = Date.parse(b.exportedAt ?? '') || Date.now();
    await db.meta.put({ key: 'settings', value: { ...DEFAULT_SETTINGS, ...b.settings, lastBackupAt, backupNudgeAfter: null } });
  });
}

export async function wipeAll() {
  await db.transaction('rw', [db.supplements, db.intakes, db.checkIns, db.meta], async () => {
    await Promise.all([db.supplements.clear(), db.intakes.clear(), db.checkIns.clear(), db.meta.clear()]);
  });
}
