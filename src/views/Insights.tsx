import { useMemo, useState, type ReactNode } from 'react';
import { adherenceRate, bestStreak, currentStreak, dayStats, perSupplementRate } from '../domain/adherence';
import { addDays, formatDay } from '../domain/dates';
import { dailyUnits, forecast, monthlyCost, stockLevel } from '../domain/inventory';
import { isActiveOn } from '../domain/schedule';
import { effectOf, verdict, type Effect } from '../domain/effects';
import { EffectView } from '../ui/Effect';
import { TIERS, TIER_ORDER } from '../domain/types';
import { cx, daysLabel, money, pct } from '../ui/format';
import { IconAlert, IconInsights } from '../ui/Icons';
import { Heatmap } from '../ui/Heatmap';
import { Avatar, Empty } from '../ui/parts';
import type { AppData } from '../ui/useData';

const RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

export function Insights({ data, onOpen, onPlan }: { data: AppData; onOpen: (id: string) => void; onPlan: () => void }) {
  const { supplements, intakes, checkIns, settings, today } = data;
  const [days, setDays] = useState(30);

  const earliest = supplements.reduce((m, s) => (s.startDate < m ? s.startDate : m), today);
  const from = [addDays(today, -(days - 1)), earliest].sort()[1];

  const stats = useMemo(() => dayStats(supplements, intakes, from, today), [supplements, intakes, from, today]);
  // Today is still in progress — leave it out of the rate so the number doesn't dip every morning.
  const closed = stats.filter((s) => s.date < today);
  const rate = adherenceRate(closed.length ? closed : stats);
  const streak = useMemo(() => currentStreak(supplements, intakes, today), [supplements, intakes, today]);
  const best = bestStreak(stats);
  const perSupp = useMemo(
    () => perSupplementRate(supplements, intakes, from, closed.length ? addDays(today, -1) : today),
    [supplements, intakes, from, today, closed.length],
  );

  const active = supplements.filter((s) => isActiveOn(s, today));
  const costs = TIER_ORDER.map((t) => ({
    tier: t,
    value: active.filter((s) => s.tier === t).reduce((n, s) => n + (monthlyCost(s, dailyUnits(s, intakes, today)) ?? 0), 0),
  }));
  const monthly = costs.reduce((n, c) => n + c.value, 0);

  const effects = useMemo(
    () =>
      supplements
        .map((s) => ({ s, e: effectOf(s, intakes, checkIns, today) }))
        .filter((x): x is { s: typeof x.s; e: NonNullable<typeof x.e> } => x.e !== null)
        .sort((a, b) => clarity(b.e) - clarity(a.e)),
    [supplements, intakes, checkIns, today],
  );
  const rated = checkIns.filter((c) => Object.keys(c.ratings).length).length;

  const runway = active
    .map((s) => ({ s, f: forecast(s, dailyUnits(s, intakes, today), today) }))
    .filter((x): x is { s: typeof x.s; f: NonNullable<typeof x.f> } => !!x.f && Number.isFinite(x.f.daysLeft))
    .sort((a, b) => a.f.daysLeft - b.f.daysLeft);

  if (!supplements.length) {
    return (
      <div className="view">
        <Empty icon={<IconInsights width={32} height={32} />} title="No data yet">
          <p>Insights appear once you've added supplements and logged a few days.</p>
        </Empty>
      </div>
    );
  }

  return (
    <div className="view">
      <header className="view-head">
        <h1>Insights</h1>
        <div className="chips" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r.days} className={cx('chip', days === r.days && 'on')} aria-pressed={days === r.days} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="stat-row four">
        <Stat label="Adherence" value={pct(rate)} />
        <Stat label="Current streak" value={`${streak} d`} />
        <Stat label="Best streak" value={`${best} d`} />
        <Stat label="Monthly spend" value={money(monthly, settings.currency, monthly >= 100)} />
      </div>

      <Card title="Daily completion" subtitle="Share of scheduled doses taken each day">
        <Heatmap stats={stats} today={today} />
      </Card>

      <div className="grid-cards">
        <Card title="By supplement" subtitle={`Doses taken, last ${Math.min(days, stats.length)} days`}>
          {perSupp.length ? (
            <ul className="plain bars">
              {perSupp.map((r) => (
                <li key={r.supplement.id}>
                  <button className="bar-row" onClick={() => onOpen(r.supplement.id)} title={`${r.supplement.name}: ${r.taken} of ${r.expected} doses`}>
                    <span className="bar-label">{r.supplement.name}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${Math.max(1, r.rate * 100)}%` }} />
                    </span>
                    <span className="bar-value">{pct(r.rate)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Nothing was scheduled in this period.</p>
          )}
        </Card>

        <Card title="Monthly cost by tier" subtitle={`${money(monthly, settings.currency)} per month for the current stack`}>
          {monthly > 0 ? (
            <>
              <div className="segbar" role="img" aria-label={costs.map((c) => `${TIERS[c.tier].label} ${money(c.value, settings.currency)}`).join(', ')}>
                {costs
                  .filter((c) => c.value > 0)
                  .map((c) => (
                    <span key={c.tier} data-tier={c.tier} style={{ flexGrow: c.value }} title={`${TIERS[c.tier].label}: ${money(c.value, settings.currency)} (${pct(c.value / monthly)})`} />
                  ))}
              </div>
              <table className="legend-table">
                <tbody>
                  {costs.map((c) => (
                    <tr key={c.tier}>
                      <td>
                        <span className="swatch" data-tier={c.tier} /> {TIERS[c.tier].label}
                      </td>
                      <td className="num">{money(c.value, settings.currency)}</td>
                      <td className="num muted">{pct(c.value / monthly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">That's about {money(monthly * 12, settings.currency, true)} a year.</p>
            </>
          ) : (
            <p className="muted small">Add container prices in the stack to see spending.</p>
          )}
        </Card>
      </div>

      <Card title="Is it working?" subtitle="How you felt with each supplement compared to without it, from your daily check-ins">
        {effects.length ? (
          <ul className="plain effect-list">
            {effects.map(({ s, e }) => (
              <li key={s.id}>
                <button className="effect-item" onClick={() => onOpen(s.id)}>
                  <span className="row gap-s">
                    <Avatar s={s} size={28} />
                    <b>{s.name}</b>
                  </span>
                  <EffectView effect={e} compact />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">
            {rated
              ? `${rated} check-in${rated === 1 ? '' : 's'} so far. Keep rating how you feel on the Today screen; comparisons appear after about two weeks.`
              : settings.checkIns
                ? 'Rate your energy, mood and sleep at the bottom of the Today screen. After about two weeks this shows which supplements seem to make a difference.'
                : 'Daily check-ins are turned off in Settings.'}
          </p>
        )}
      </Card>

      <Card title="Stock runway" subtitle="Days until each supplement runs out at the current pace">
        {runway.length ? (
          <ul className="plain runway">
            {runway.map(({ s, f }) => {
              const level = stockLevel(f, settings.lowStockDays);
              return (
                <li key={s.id}>
                  <button className="runway-row" onClick={() => onOpen(s.id)}>
                    <Avatar s={s} size={32} />
                    <span className="runway-name">{s.name}</span>
                    <span className="bar-track">
                      <span className={cx('bar-fill', level)} style={{ width: `${Math.max(1, Math.min(1, f.daysLeft / 120) * 100)}%` }} />
                    </span>
                    <span className="runway-value">
                      {level !== 'ok' && <IconAlert width={14} height={14} className={level} />}
                      {level === 'out' ? 'Out' : daysLabel(f.daysLeft)}
                      {f.runOutOn && level !== 'out' && <span className="muted"> · {formatDay(f.runOutOn, { month: 'short', day: 'numeric' })}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted small">Turn on inventory tracking for a supplement to see when it runs out.</p>
        )}
        {runway.length > 0 && (
          <button className="link-btn small go-link" onClick={onPlan}>
            Plan an order
          </button>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      {subtitle && <p className="card-sub">{subtitle}</p>}
      {children}
    </section>
  );
}

/** Clear results first (largest clear difference), then everything else by raw size. */
const clarity = (e: Effect) =>
  Math.max(...e.rows.map((r) => (verdict(r) === 'same' ? Math.abs(r.delta) / 100 : 1 + Math.abs(r.delta))));
