import { useMemo } from 'react';
import { restock } from '../db';
import { adherenceRate, dayStats } from '../domain/adherence';
import { addDays, formatDay } from '../domain/dates';
import { effectOf, ratedDaysSince } from '../domain/effects';
import { costPerUnit, dailyUnits, forecast, monthlyCost, stockLevel } from '../domain/inventory';
import { describeSchedule } from '../domain/schedule';
import { SLOTS, type Supplement } from '../domain/types';
import { EffectPending, EffectView } from '../ui/Effect';
import { cx, daysLabel, money, pct, units } from '../ui/format';
import { Heatmap } from '../ui/Heatmap';
import { IconBox, IconFood, IconLink } from '../ui/Icons';
import { Avatar, Sheet, TierBadge } from '../ui/parts';
import { useToast } from '../ui/toast';
import type { AppData } from '../ui/useData';

export function Detail({ s, data, onClose, onEdit }: { s: Supplement; data: AppData; onClose: () => void; onEdit: () => void }) {
  const { intakes, checkIns, settings, today } = data;
  const toast = useToast();

  const last = s.archivedOn ? addDays(s.archivedOn, -1) : today;
  const from = [addDays(last, -83), s.startDate].sort()[1];
  const stats = useMemo(() => (from <= last ? dayStats([s], intakes, from, last) : []), [s, intakes, from, last]);
  const recent = stats.filter((x) => x.date >= addDays(last, -29) && x.date < today);
  const rate = adherenceRate(recent);
  const daily = dailyUnits(s, intakes, today);
  const f = forecast(s, daily, today);
  const level = stockLevel(f, settings.lowStockDays);
  const monthly = monthlyCost(s, daily);
  const cpu = costPerUnit(s);
  const effect = useMemo(() => effectOf(s, intakes, checkIns, today), [s, intakes, checkIns, today]);
  const asNeeded = s.schedule.kind === 'asNeeded';

  const footer = (
    <>
      {s.link && /^https?:\/\//.test(s.link) && (
        <a className="btn" href={s.link} target="_blank" rel="noreferrer noopener">
          <IconLink width={16} height={16} /> Buy
        </a>
      )}
      {s.stock.unitsPerContainer && s.stock.unitsLeft != null ? (
        <button
          className="btn"
          onClick={async () => {
            await restock(s.id);
            toast(`Restocked ${s.name} (+${units(s.stock.unitsPerContainer!, s.form)})`, { label: 'Undo', run: () => restock(s.id, -1) });
          }}
        >
          <IconBox width={16} height={16} /> Restock
        </button>
      ) : null}
      <button className="btn primary push" onClick={onEdit}>
        Edit
      </button>
    </>
  );

  return (
    <Sheet open onClose={onClose} title={s.name} footer={footer}>
      <div className="detail">
        <div className="detail-head">
          <Avatar s={s} size={72} />
          <div className="grow">
            <div className="row gap-s wrap">
              <TierBadge tier={s.tier} long />
              {s.archivedOn && <span className="pill">Archived</span>}
            </div>
            {(s.brand || s.strength) && <p className="muted small">{[s.brand, s.strength].filter(Boolean).join(' · ')}</p>}
            <p className="small">
              {describeSchedule(s.schedule)}
              {!asNeeded && ' · ' + s.doses.map((d) => `${SLOTS[d.slot]} (${units(d.units, s.form)})`).join(', ')}
              {asNeeded && ` · ${units(s.doses[0].units, s.form)}`}
              {s.withFood && (
                <>
                  {' · '}
                  <IconFood width={14} height={14} className="inline-icon" /> with food
                </>
              )}
            </p>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">{asNeeded ? 'Taken, 30 days' : 'Adherence, 30 days'}</span>
            <span className="stat-value">{asNeeded ? `${intakes.filter((i) => i.supplementId === s.id && i.status === 'taken' && i.date >= addDays(today, -29)).length}×` : pct(rate)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Stock</span>
            <span className={cx('stat-value', 'smaller', level === 'low' && 'warn', level === 'out' && 'crit')}>
              {f ? (level === 'out' ? 'Out' : daysLabel(f.daysLeft)) : 'Not tracked'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Per month</span>
            <span className="stat-value smaller" title={cpu != null ? `${money(cpu, settings.currency)} per unit` : undefined}>
              {monthly != null ? money(monthly, settings.currency) : '—'}
            </span>
          </div>
        </div>

        {f?.runOutOn && level !== 'out' && (
          <p className="small muted">
            {units(f.unitsLeft, s.form)} left, which lasts until {formatDay(f.runOutOn, { weekday: 'short', month: 'short', day: 'numeric' })}.
          </p>
        )}

        {!asNeeded && stats.length > 0 && (
          <section>
            <h3 className="detail-h">History</h3>
            <Heatmap stats={stats} today={today} />
          </section>
        )}

        <section>
          <h3 className="detail-h">Is it working?</h3>
          {effect ? <EffectView effect={effect} /> : <EffectPending rated={ratedDaysSince(checkIns, addDays(s.startDate, -60))} />}
        </section>

        {s.notes && (
          <section>
            <h3 className="detail-h">Notes</h3>
            <p className="detail-notes">{s.notes}</p>
          </section>
        )}
      </div>
    </Sheet>
  );
}
