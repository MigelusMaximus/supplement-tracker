import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, getSettings } from '../db';
import { todayKey } from '../domain/dates';
import { DEFAULT_SETTINGS, type CheckIn, type Intake, type Settings, type Supplement } from '../domain/types';

export interface AppData {
  ready: boolean;
  supplements: Supplement[];
  intakes: Intake[];
  checkIns: CheckIn[];
  settings: Settings;
  today: string;
}

/** Reactive view of the whole database. Small enough (years of logs ≈ tens of KB) to keep in memory. */
export function useData(): AppData {
  const supplements = useLiveQuery(() => db.supplements.toArray());
  const intakes = useLiveQuery(() => db.intakes.toArray());
  const checkIns = useLiveQuery(() => db.checkIns.toArray());
  const settings = useLiveQuery(() => getSettings());
  const today = useToday();
  return {
    ready: !!supplements && !!intakes && !!checkIns && !!settings,
    supplements: supplements ?? [],
    intakes: intakes ?? [],
    checkIns: checkIns ?? [],
    settings: settings ?? DEFAULT_SETTINGS,
    today,
  };
}

/** The current day key, rolling over at midnight and when the tab regains focus. */
function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}
