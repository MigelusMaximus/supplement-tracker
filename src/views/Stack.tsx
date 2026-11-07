import { useMemo, useState } from 'react';
import { costPerUnit, dailyUnits, forecast, monthlyCost, stockLevel } from '../domain/inventory';
import { describeSchedule } from '../domain/schedule';
import { SLOTS, TIERS, TIER_ORDER, type Supplement, type Tier } from '../domain/types';
import { cx, daysLabel, money } from '../ui/format';
import { IconBox, IconPlus, IconSearch, IconStack } from '../ui/Icons';
import { Avatar, Empty, TierBadge } from '../ui/parts';
import type { AppData } from '../ui/useData';

export function Stack({ data, onOpen, onAdd, onPlan }: { data: AppData; onOpen: (id: string) => void; onAdd: () => void; onPlan: () => void }) {
  const { supplements, intakes, settings, today } = data;
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<Tier | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const rows = useMemo(
    () =>
      supplements.map((s) => {
        const daily = dailyUnits(s, intakes, today);
        const f = forecast(s, daily, today);
        return { s, daily, monthly: monthlyCost(s, daily), f, level: stockLevel(f, settings.lowStockDays) };
      }),
    [supplements, intakes, today, settings.lowStockDays],
  );

  const active = rows.filter((r) => r.s.archivedOn === null);
  const archived = rows.filter((r) => r.s.archivedOn !== null);
  const totalMonthly = active.reduce((n, r) => n + (r.monthly ?? 0), 0);
  const totalDaily = active.reduce((n, r) => n + r.daily, 0);

  const q = query.trim().toLowerCase();
  const visible = active.filter(
    (r) => (!tier || r.s.tier === tier) && (!q || `${r.s.name} ${r.s.brand} ${r.s.strength}`.toLowerCase().includes(q)),
  );

  if (!supplements.length) {
    return (
      <div className="view">
        <Empty icon={<IconStack width={32} height={32} />} title="No supplements yet">
          <button className="btn primary" onClick={onAdd}>
            <IconPlus /> Add your first supplement
          </button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="view">
      <header className="view-head">
        <h1>Stack</h1>
        <div className="row gap-s">
          <button className="btn" onClick={onPlan}>
            <IconBox width={18} height={18} /> Restock plan
          </button>
          <button className="btn primary" onClick={onAdd}>
            <IconPlus /> Add
          </button>
        </div>
      </header>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Active</span>
          <span className="stat-value">{active.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Units per day</span>
          <span className="stat-value">{totalDaily.toFixed(totalDaily % 1 ? 1 : 0)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Per month</span>
          <span className="stat-value">{money(totalMonthly, settings.currency)}</span>
        </div>
      </div>

      <div className="filters">
        <label className="search">
          <IconSearch />
          <input type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search supplements" />
        </label>
        <div className="chips" role="group" aria-label="Filter by tier">
          <button className={cx('chip', !tier && 'on')} onClick={() => setTier(null)}>
            All
          </button>
          {TIER_ORDER.map((t) => (
            <button key={t} className={cx('chip', tier === t && 'on')} onClick={() => setTier(tier === t ? null : t)} aria-pressed={tier === t}>
              <TierBadge tier={t} long />
            </button>
          ))}
        </div>
      </div>

      {TIER_ORDER.map((t) => {
        const list = visible.filter((r) => r.s.tier === t).sort((a, b) => a.s.name.localeCompare(b.s.name));
        if (!list.length) return null;
        return (
          <section key={t} className="tier-group">
            <h2 className="tier-head">
              <TierBadge tier={t} /> {TIERS[t].label} <span className="muted small">· {TIERS[t].hint}</span>
            </h2>
            <ul className="plain card-list">
              {list.map((r) => (
                <StackCard key={r.s.id} {...r} currency={settings.currency} lowDays={settings.lowStockDays} onOpen={() => onOpen(r.s.id)} />
              ))}
            </ul>
          </section>
        );
      })}
      {!visible.length && <p className="muted center pad">Nothing matches.</p>}

      {archived.length > 0 && (
        <section className="tier-group">
          <button className="link-btn" onClick={() => setShowArchived(!showArchived)} aria-expanded={showArchived}>
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && (
            <ul className="plain card-list archived">
              {archived.map((r) => (
                <StackCard key={r.s.id} {...r} currency={settings.currency} lowDays={settings.lowStockDays} onOpen={() => onOpen(r.s.id)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function StackCard({ s, monthly, f, level, currency, lowDays, onOpen }: {
  s: Supplement;
  monthly: number | null;
  f: ReturnType<typeof forecast>;
  level: ReturnType<typeof stockLevel>;
  currency: string;
  lowDays: number;
  onOpen: () => void;
}) {
  const cpu = costPerUnit(s);
  // Meter shows days of cover relative to a 90-day horizon.
  const cover = f && Number.isFinite(f.daysLeft) ? Math.min(1, f.daysLeft / Math.max(90, lowDays * 3)) : 1;
  return (
    <li>
      <button className="stack-card" onClick={onOpen}>
        <Avatar s={s} size={48} />
        <span className="stack-main">
          <span className="stack-name">{s.name}</span>
          <span className="muted small">
            {[s.brand, s.strength].filter(Boolean).join(' · ') || ' '}
          </span>
          <span className="stack-sched small">
            {describeSchedule(s.schedule)}
            {s.schedule.kind !== 'asNeeded' && ' · ' + s.doses.map((d) => SLOTS[d.slot]).join(', ')}
          </span>
        </span>
        <span className="stack-side">
          {monthly != null && (
            <span className="small" title={cpu != null ? `${money(cpu, currency)} per unit` : undefined}>
              <b>{money(monthly, currency)}</b>
              <span className="muted">/mo</span>
            </span>
          )}
          {f && (
            <span className="stock">
              <span className={cx('meter', level)} aria-hidden>
                <span style={{ width: `${Math.max(level === 'out' ? 0 : 4, cover * 100)}%` }} />
              </span>
              <span className={cx('small', level !== 'ok' && 'strong')}>
                {level === 'out' ? 'Out of stock' : daysLabel(f.daysLeft)}
              </span>
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
