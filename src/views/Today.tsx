import { useEffect, useMemo, useRef, useState } from 'react';
import { restock, setDose, updateSettings } from '../db';
import { currentStreak, dayStat, intakeIndex } from '../domain/adherence';
import { addDays, formatDay, relativeDayLabel } from '../domain/dates';
import { dailyUnits, forecast, stockLevel } from '../domain/inventory';
import { dosesForDay, isActiveOn, type DueDose } from '../domain/schedule';
import { SLOTS, SLOT_ORDER, intakeId, type Intake, type Slot } from '../domain/types';
import { cx, daysLabel, units } from '../ui/format';
import { IconAlert, IconCheck, IconChevL, IconChevR, IconFlame, IconFood, IconPlus, IconSkip, IconSlot, IconStack } from '../ui/Icons';
import { backupAge, backupDue, downloadBackup, snoozeUntil } from '../ui/backup';
import { Avatar, Empty, TierBadge } from '../ui/parts';
import { useToast } from '../ui/toast';
import type { AppData } from '../ui/useData';
import { CheckInCard } from './CheckInCard';

interface Props {
  data: AppData;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onLoadExample: () => void;
  onPlan: () => void;
}

/** Which part of the day it is right now, to highlight the slot that's due. */
function currentSlot(d = new Date()): Slot {
  const h = d.getHours();
  if (h >= 4 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'midday';
  if (h >= 16 && h < 21) return 'evening';
  return 'bedtime';
}

export function Today({ data, onOpen, onAdd, onLoadExample, onPlan }: Props) {
  const { supplements, intakes, checkIns, settings, today } = data;
  const [day, setDay] = useState(today);
  const toast = useToast();

  // Follow midnight rollover if the user was looking at "today".
  const prevToday = useRef(today);
  useEffect(() => {
    if (day === prevToday.current) setDay(today);
    prevToday.current = today;
  }, [today, day]);

  const index = useMemo(() => intakeIndex(intakes), [intakes]);
  const doses = useMemo(() => dosesForDay(supplements, day), [supplements, day]);
  const stat = useMemo(() => dayStat(supplements, index, day), [supplements, index, day]);
  const streak = useMemo(() => currentStreak(supplements, intakes, today), [supplements, intakes, today]);
  const isFuture = day > today;
  const nowSlot = day === today ? currentSlot() : null;
  const checkIn = checkIns.find((c) => c.date === day);
  const needsBackup = backupDue(settings, intakes.length);

  const lowStock = useMemo(
    () =>
      supplements
        .filter((s) => isActiveOn(s, today))
        .map((s) => ({ s, f: forecast(s, dailyUnits(s, intakes, today), today) }))
        .map((x) => ({ ...x, level: stockLevel(x.f, settings.lowStockDays) }))
        .filter((x) => x.level === 'low' || x.level === 'out')
        .sort((a, b) => a.f!.daysLeft - b.f!.daysLeft),
    [supplements, intakes, today, settings.lowStockDays],
  );

  if (!supplements.some((s) => s.archivedOn === null)) {
    return (
      <div className="view">
        <Empty icon={<IconStack width={32} height={32} />} title="Build your stack">
          <p>Add the supplements you take and when. Each day you'll get a checklist, and the app tracks adherence, stock and spending.</p>
          <div className="row gap center">
            <button className="btn primary" onClick={onAdd}>
              <IconPlus /> Add a supplement
            </button>
            <button className="btn" onClick={onLoadExample}>
              Try an example stack
            </button>
          </div>
          <a className="link-btn" href="#guide">
            New here? Read the 2-minute guide
          </a>
        </Empty>
      </div>
    );
  }

  const groups: { key: Slot | 'any'; label: string; doses: DueDose[] }[] = [
    ...SLOT_ORDER.map((slot) => ({ key: slot, label: SLOTS[slot], doses: doses.filter((d) => !d.optional && d.slot === slot) })),
    { key: 'any' as const, label: 'As needed', doses: doses.filter((d) => d.optional) },
  ].filter((g) => g.doses.length);

  const statusOf = (d: DueDose): Intake['status'] | undefined => index.get(intakeId(day, d.supplement.id, d.slot))?.status;
  const toggle = (d: DueDose, status: Intake['status']) =>
    setDose(d.supplement.id, day, d.slot, d.units, statusOf(d) === status ? null : status);

  const takeAll = async (ds: DueDose[]) => {
    await Promise.all(ds.map((d) => setDose(d.supplement.id, day, d.slot, d.units, 'taken')));
    toast(ds.length === 1 ? `Took ${ds[0].supplement.name}` : `Took ${ds.length} doses`, { label: 'Undo', run: () => ds.forEach((d) => setDose(d.supplement.id, day, d.slot, d.units, null)) });
  };

  // Everything still open today. Deliberate skips and as-needed doses are left alone.
  const open = doses.filter((d) => !d.optional && !statusOf(d));

  const rel = relativeDayLabel(day, today);
  const progress = stat.expected ? stat.taken / stat.expected : 0;

  return (
    <div className="view">
      <header className="today-head">
        <div className="day-nav">
          <button className="icon-btn" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">
            <IconChevL />
          </button>
          <div className="day-title">
            <span className="eyebrow">{rel ?? formatDay(day, { weekday: 'long' })}</span>
            <h1>{formatDay(day, { weekday: rel ? 'long' : undefined, month: 'long', day: 'numeric' })}</h1>
          </div>
          <button className="icon-btn" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">
            <IconChevR />
          </button>
          {day !== today && (
            <button className="chip" onClick={() => setDay(today)}>
              Back to today
            </button>
          )}
        </div>

        <div className="today-summary">
          <Ring value={progress} done={stat.expected > 0 && stat.taken === stat.expected} />
          <div>
            <div className="big">
              {stat.taken}
              <span className="muted"> / {stat.expected}</span>
            </div>
            <div className="muted small">doses taken{stat.skipped ? ` · ${stat.skipped} skipped` : ''}</div>
          </div>
          <div className="streak" title="Days in a row with every scheduled dose taken">
            <IconFlame />
            <b>{streak}</b>
            <span className="muted small">day streak</span>
          </div>
          {!isFuture && open.length > 0 && (
            <button className="btn take-all" onClick={() => takeAll(open)}>
              <IconCheck width={18} height={18} />
              {stat.taken === 0 ? `Take all ${open.length}` : `Take the remaining ${open.length}`}
            </button>
          )}
        </div>
      </header>

      {day === today && needsBackup && (
        <section className="card nudge" aria-label="Backup reminder">
          <div>
            <b>Back up your data</b>
            <p className="small muted">
              {backupAge(settings.lastBackupAt)}. Everything lives only on this device, so one file keeps it safe.
            </p>
          </div>
          <div className="row gap-s">
            <button
              className="btn small primary"
              onClick={async () => {
                await downloadBackup();
                toast('Backup downloaded');
              }}
            >
              Back up now
            </button>
            <button className="btn small ghost" onClick={() => updateSettings({ backupNudgeAfter: snoozeUntil(7) })}>
              Later
            </button>
          </div>
        </section>
      )}

      {day === today && lowStock.length > 0 && (
        <section className="card alert" aria-label="Running low">
          <div className="alert-title">
            <IconAlert /> Running low
            <button className="link-btn small push" onClick={onPlan}>
              Plan an order
            </button>
          </div>
          <ul className="plain">
            {lowStock.map(({ s, f, level }) => (
              <li key={s.id} className="row between">
                <button className="link-btn" onClick={() => onOpen(s.id)}>
                  {s.name}
                </button>
                <span className="row gap-s">
                  <span className={cx('pill', level === 'out' ? 'critical' : 'warning')}>
                    {level === 'out' ? 'Out of stock' : daysLabel(f!.daysLeft)}
                  </span>
                  {s.stock.unitsPerContainer ? (
                    <button
                      className="btn small"
                      onClick={async () => {
                        await restock(s.id);
                        toast(`Restocked ${s.name} (+${units(s.stock.unitsPerContainer!, s.form)})`, { label: 'Undo', run: () => restock(s.id, -1) });
                      }}
                    >
                      Restock
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.length === 0 && (
        <Empty icon={<IconCheck width={32} height={32} />} title="Nothing scheduled">
          <p>No doses are planned for this day.</p>
        </Empty>
      )}

      {groups.map((g) => {
        const allTaken = g.key !== 'any' && g.doses.every((d) => statusOf(d) === 'taken');
        const isNow = g.key === nowSlot && !allTaken;
        return (
          <section key={g.key} className={cx('slot', isNow && 'is-now', allTaken && 'is-done')}>
            <header className="slot-head">
              <h2>
                <IconSlot slot={g.key} /> {g.label}
                {isNow && <span className="now-tag">Now</span>}
                {allTaken && (
                  <span className="done-tag">
                    <IconCheck width={14} height={14} /> Done
                  </span>
                )}
              </h2>
            </header>
            <ul className="plain dose-list">
              {g.doses.map((d) => (
                <DoseRow
                  key={d.supplement.id + d.slot}
                  dose={d}
                  status={statusOf(d)}
                  disabled={isFuture}
                  onToggle={() => toggle(d, 'taken')}
                  onSkip={() => toggle(d, 'skipped')}
                  onOpen={() => onOpen(d.supplement.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {settings.checkIns && !isFuture && <CheckInCard key={day} date={day} checkIn={checkIn} isToday={day === today} />}
    </div>
  );
}

function DoseRow({ dose, status, disabled, onToggle, onSkip, onOpen }: {
  dose: DueDose;
  status?: Intake['status'];
  disabled: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onOpen: () => void;
}) {
  const s = dose.supplement;
  const taken = status === 'taken';
  const skipped = status === 'skipped';
  return (
    <li className={cx('dose', taken && 'is-taken', skipped && 'is-skipped')}>
      <button className="dose-main" onClick={onOpen} aria-label={`${s.name} details`}>
        <Avatar s={s} />
        <span className="dose-text">
          <span className="dose-name">
            {s.name} <TierBadge tier={s.tier} />
          </span>
          <span className="dose-meta">
            {units(dose.units, s.form)}
            {s.strength && <> · {s.strength}</>}
            {s.withFood && (
              <span className="with-food">
                {' '}
                · <IconFood width={14} height={14} /> with food
              </span>
            )}
          </span>
        </span>
      </button>
      {!disabled && !taken && !dose.optional && (
        <button className={cx('icon-btn', 'skip-btn', skipped && 'active')} onClick={onSkip} aria-pressed={skipped} title={skipped ? 'Undo skip' : 'Skip this dose'}>
          <IconSkip />
          <span className="sr-only">{skipped ? 'Undo skip' : 'Skip'}</span>
        </button>
      )}
      <button
        className={cx('check', taken && 'on')}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={taken}
        aria-label={taken ? `Mark ${s.name} as not taken` : `Mark ${s.name} as taken`}
      >
        <IconCheck />
      </button>
    </li>
  );
}

function Ring({ value, done }: { value: number; done: boolean }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg className={cx('ring', done && 'done')} width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r={r} className="ring-track" />
      <circle cx="32" cy="32" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform="rotate(-90 32 32)" />
      {done && <path d="m24 32.5 5.5 5.5L41 26.5" className="ring-check" />}
    </svg>
  );
}
