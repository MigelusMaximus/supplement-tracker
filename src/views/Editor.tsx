import { useState } from 'react';
import { archiveSupplement, deleteSupplement, restock, saveSupplement } from '../db';
import { formatDay } from '../domain/dates';
import { costPerUnit, dailyUnits, forecast, monthlyCost } from '../domain/inventory';
import {
  FORM_UNIT,
  SLOTS,
  SLOT_ORDER,
  TIERS,
  TIER_ORDER,
  type Form,
  type Schedule,
  type Slot,
  type Supplement,
} from '../domain/types';
import { cx, daysLabel, money, units } from '../ui/format';
import { IconCamera, IconLink, IconMinus, IconPlus, IconSlot, IconX } from '../ui/Icons';
import { Avatar, Sheet, TierBadge } from '../ui/parts';
import { useToast } from '../ui/toast';
import type { AppData } from '../ui/useData';

const FORMS: Form[] = ['capsule', 'tablet', 'softgel', 'powder', 'liquid', 'gummy', 'drops', 'other'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const WEEK_LABEL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Editor({ initial, isNew, data, onClose }: {
  initial: Supplement;
  isNew: boolean;
  data: AppData;
  onClose: () => void;
}) {
  const [s, setS] = useState<Supplement>(initial);
  const [tracking, setTracking] = useState(initial.stock.unitsLeft != null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();
  const set = (patch: Partial<Supplement>) => setS((x) => ({ ...x, ...patch }));
  const setStock = (patch: Partial<Supplement['stock']>) => setS((x) => ({ ...x, stock: { ...x.stock, ...patch } }));

  const [one, many] = FORM_UNIT[s.form];
  const asNeeded = s.schedule.kind === 'asNeeded';
  const valid = s.name.trim() && s.doses.length > 0 && (s.schedule.kind !== 'weekly' || s.schedule.days.length > 0);

  const stock = tracking ? s.stock : { unitsLeft: null, unitsPerContainer: null, price: null };
  const preview = { ...s, stock };
  const daily = dailyUnits(preview, data.intakes, data.today);
  const cpu = costPerUnit(preview);
  const monthly = monthlyCost(preview, daily);
  const f = forecast(preview, daily, data.today);

  async function save() {
    if (!valid) return;
    await saveSupplement({ ...s, name: s.name.trim(), brand: s.brand.trim(), stock });
    toast(isNew ? `Added ${s.name.trim()}` : 'Saved');
    onClose();
  }

  function setScheduleKind(kind: Schedule['kind']) {
    const next: Schedule =
      kind === 'weekly' ? { kind, days: [1, 2, 3, 4, 5] } :
      kind === 'interval' ? { kind, every: 2, anchor: data.today } :
      { kind };
    // As-needed supplements have a single dose with no specific time.
    set({ schedule: next, doses: kind === 'asNeeded' ? [s.doses[0] ?? { slot: 'morning', units: 1 }] : s.doses });
  }

  function toggleSlot(slot: Slot) {
    const has = s.doses.find((d) => d.slot === slot);
    const doses = has ? s.doses.filter((d) => d.slot !== slot) : [...s.doses, { slot, units: s.doses[0]?.units ?? 1 }];
    set({ doses: doses.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)) });
  }

  const setUnits = (slot: Slot, n: number) =>
    set({ doses: s.doses.map((d) => (d.slot === slot ? { ...d, units: Math.max(0.5, Math.round(n * 2) / 2) } : d)) });

  const footer = (
    <>
      {!isNew && (
        <div className="row gap-s">
          {confirmDelete ? (
            <>
              <button
                className="btn danger"
                onClick={async () => {
                  await deleteSupplement(s.id);
                  toast(`Deleted ${s.name}`);
                  onClose();
                }}
              >
                Delete forever
              </button>
              <button className="btn ghost" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </>
          ) : (
            <>
              <button
                className="btn ghost"
                onClick={async () => {
                  await archiveSupplement(s.id, initial.archivedOn === null);
                  toast(initial.archivedOn === null ? `Archived ${s.name}. History is kept.` : `${s.name} is back in your stack`);
                  onClose();
                }}
              >
                {initial.archivedOn === null ? 'Archive' : 'Unarchive'}
              </button>
              <button className="btn ghost danger-text" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </>
          )}
        </div>
      )}
      <div className="row gap-s push">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={save} disabled={!valid}>
          {isNew ? 'Add to stack' : 'Save'}
        </button>
      </div>
    </>
  );

  return (
    <Sheet open onClose={onClose} title={isNew ? 'New supplement' : s.name || 'Edit supplement'} footer={footer}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {/* --- Basics --- */}
        <div className="form-identity">
          <ImagePicker s={s} onChange={(image) => set({ image })} />
          <div className="grow">
            <label className="field">
              <span>Name</span>
              <input autoFocus={isNew} required value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Vitamin D3" />
            </label>
            <label className="field">
              <span>Brand <em>optional</em></span>
              <input value={s.brand} onChange={(e) => set({ brand: e.target.value })} />
            </label>
          </div>
        </div>

        <div className="grid-2">
          <label className="field">
            <span>Form</span>
            <select value={s.form} onChange={(e) => set({ form: e.target.value as Form })}>
              {FORMS.map((f) => (
                <option key={f} value={f}>
                  {f[0].toUpperCase() + f.slice(1)} ({FORM_UNIT[f][1]})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Strength <em>optional</em></span>
            <input value={s.strength} onChange={(e) => set({ strength: e.target.value })} placeholder={`e.g. 500 mg per ${one}`} />
          </label>
        </div>

        <fieldset className="field">
          <legend>Priority</legend>
          <div className="tier-picker">
            {TIER_ORDER.map((t) => (
              <label key={t} className={cx('tier-option', s.tier === t && 'on')}>
                <input type="radio" name="tier" checked={s.tier === t} onChange={() => set({ tier: t })} />
                <TierBadge tier={t} long />
                <span className="muted small">{TIERS[t].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* --- Schedule --- */}
        <h3 className="form-section">Schedule</h3>
        <div className="segmented" role="radiogroup" aria-label="Frequency">
          {(
            [
              ['daily', 'Daily'],
              ['weekly', 'Some days'],
              ['interval', 'Every N days'],
              ['asNeeded', 'As needed'],
            ] as const
          ).map(([k, label]) => (
            <button type="button" key={k} role="radio" aria-checked={s.schedule.kind === k} className={cx(s.schedule.kind === k && 'on')} onClick={() => setScheduleKind(k)}>
              {label}
            </button>
          ))}
        </div>

        {s.schedule.kind === 'weekly' && (
          <div className="weekdays" role="group" aria-label="Days of the week">
            {WEEK.map((d) => {
              const days = (s.schedule as { days: number[] }).days;
              const on = days.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  aria-pressed={on}
                  aria-label={formatDay(`2026-11-0${d + 1}`, { weekday: 'long' })}
                  className={cx(on && 'on')}
                  onClick={() => set({ schedule: { kind: 'weekly', days: on ? days.filter((x) => x !== d) : [...days, d] } })}
                >
                  {WEEK_LABEL[d]}
                </button>
              );
            })}
          </div>
        )}

        {s.schedule.kind === 'interval' && (
          <div className="grid-2">
            <label className="field">
              <span>Every</span>
              <div className="suffix">
                <input
                  type="number"
                  min={2}
                  max={60}
                  value={s.schedule.every}
                  onChange={(e) => set({ schedule: { ...(s.schedule as Extract<Schedule, { kind: 'interval' }>), every: Math.max(1, Number(e.target.value) || 1) } })}
                />
                <span>days</span>
              </div>
            </label>
            <label className="field">
              <span>Starting</span>
              <input
                type="date"
                value={s.schedule.anchor}
                onChange={(e) => e.target.value && set({ schedule: { ...(s.schedule as Extract<Schedule, { kind: 'interval' }>), anchor: e.target.value } })}
              />
            </label>
          </div>
        )}

        {asNeeded ? (
          <div className="slot-row on">
            <span>Dose</span>
            <Stepper value={s.doses[0].units} label={(n) => units(n, s.form)} onChange={(n) => setUnits(s.doses[0].slot, n)} />
          </div>
        ) : (
          <div className="slots">
            {SLOT_ORDER.map((slot) => {
              const dose = s.doses.find((d) => d.slot === slot);
              return (
                <div key={slot} className={cx('slot-row', dose && 'on')}>
                  <label className="check-label">
                    <input type="checkbox" checked={!!dose} onChange={() => toggleSlot(slot)} />
                    <IconSlot slot={slot} /> {SLOTS[slot]}
                  </label>
                  {dose && <Stepper value={dose.units} label={(n) => units(n, s.form)} onChange={(n) => setUnits(slot, n)} />}
                </div>
              );
            })}
            {!s.doses.length && <p className="error small">Pick at least one time of day.</p>}
          </div>
        )}

        <label className="switch">
          <input type="checkbox" checked={s.withFood} onChange={(e) => set({ withFood: e.target.checked })} />
          <span>Take with food</span>
        </label>

        {/* --- Inventory --- */}
        <h3 className="form-section">Inventory &amp; cost</h3>
        <label className="switch">
          <input
            type="checkbox"
            checked={tracking}
            onChange={(e) => {
              setTracking(e.target.checked);
              if (e.target.checked && s.stock.unitsLeft == null) setStock({ unitsLeft: s.stock.unitsPerContainer ?? 0 });
            }}
          />
          <span>Track how much I have left</span>
        </label>
        {tracking && (
          <>
            <div className="grid-3">
              <NumField label={`${many[0].toUpperCase() + many.slice(1)} left`} value={s.stock.unitsLeft} onChange={(v) => setStock({ unitsLeft: v })} />
              <NumField label={`${many[0].toUpperCase() + many.slice(1)} per container`} value={s.stock.unitsPerContainer} onChange={(v) => setStock({ unitsPerContainer: v })} />
              <NumField label={`Price (${data.settings.currency})`} value={s.stock.price} step="0.01" onChange={(v) => setStock({ price: v })} />
            </div>
            <div className="calc">
              <div>
                <span className="muted small">Per {one}</span>
                <b>{cpu != null ? money(cpu, data.settings.currency) : '—'}</b>
              </div>
              <div>
                <span className="muted small">Per month</span>
                <b>{monthly != null ? money(monthly, data.settings.currency) : '—'}</b>
              </div>
              <div>
                <span className="muted small">Lasts</span>
                <b>{f ? (f.runOutOn ? `until ${formatDay(f.runOutOn, { month: 'short', day: 'numeric' })}` : daysLabel(f.daysLeft)) : '—'}</b>
              </div>
            </div>
            {!isNew && s.stock.unitsPerContainer ? (
              <button
                type="button"
                className="btn small"
                onClick={async () => {
                  await restock(s.id);
                  setStock({ unitsLeft: Math.max(0, s.stock.unitsLeft ?? 0) + s.stock.unitsPerContainer! });
                  toast(`+${units(s.stock.unitsPerContainer!, s.form)}`);
                }}
              >
                <IconPlus width={16} height={16} /> Opened a new container
              </button>
            ) : null}
          </>
        )}

        {/* --- Notes --- */}
        <h3 className="form-section">Notes</h3>
        <label className="field">
          <span>Where to buy <em>optional</em></span>
          <div className="with-action">
            <input type="url" value={s.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" />
            {/^https?:\/\//.test(s.link) && (
              <a className="icon-btn" href={s.link} target="_blank" rel="noreferrer noopener" aria-label="Open link">
                <IconLink />
              </a>
            )}
          </div>
        </label>
        <label className="field">
          <span>Notes <em>optional</em></span>
          <textarea rows={3} value={s.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Why you take it, how it makes you feel, when to re-evaluate…" />
        </label>
        <label className="field narrow">
          <span>Counting from</span>
          <input type="date" value={s.startDate} max={data.today} onChange={(e) => e.target.value && set({ startDate: e.target.value })} />
        </label>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: (n: number) => string }) {
  return (
    <div className="stepper">
      <button type="button" className="icon-btn" onClick={() => onChange(value - (value > 1 ? 1 : 0.5))} disabled={value <= 0.5} aria-label="Less">
        <IconMinus width={16} height={16} />
      </button>
      <span>{label(value)}</span>
      <button type="button" className="icon-btn" onClick={() => onChange(value + (value >= 1 ? 1 : 0.5))} aria-label="More">
        <IconPlus width={16} height={16} />
      </button>
    </div>
  );
}

function NumField({ label, value, onChange, step = '1' }: { label: string; value: number | null; onChange: (v: number | null) => void; step?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
      />
    </label>
  );
}

function ImagePicker({ s, onChange }: { s: Supplement; onChange: (img: string | null) => void }) {
  return (
    <div className="image-picker">
      <label className="image-drop" title="Add a photo">
        <Avatar s={{ ...s, name: s.name || '+' }} size={88} />
        <span className="image-badge">
          <IconCamera width={16} height={16} />
        </span>
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) onChange(await thumbnail(file));
            e.target.value = '';
          }}
        />
      </label>
      {s.image && (
        <button type="button" className="link-btn small" onClick={() => onChange(null)}>
          <IconX width={14} height={14} /> Remove
        </button>
      )}
    </div>
  );
}

/** Square-crop and shrink a photo so it's a few KB in the database. */
async function thumbnail(file: File, size = 192): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close();
  return canvas.toDataURL('image/webp', 0.82);
}
