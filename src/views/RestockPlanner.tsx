import { useMemo, useState } from 'react';
import { restock } from '../db';
import { formatDay } from '../domain/dates';
import { dailyUnits, restockNeed } from '../domain/inventory';
import { isActiveOn } from '../domain/schedule';
import { cx, money } from '../ui/format';
import { IconCheck, IconLink } from '../ui/Icons';
import { Avatar, Empty, Sheet } from '../ui/parts';
import { useToast } from '../ui/toast';
import type { AppData } from '../ui/useData';

const HORIZONS = [30, 60, 90];

export function RestockPlanner({ data, onClose }: { data: AppData; onClose: () => void }) {
  const { supplements, intakes, settings, today } = data;
  const [horizon, setHorizon] = useState(30);
  const toast = useToast();

  const tracked = supplements.filter((s) => isActiveOn(s, today) && s.stock.unitsLeft != null && s.stock.unitsPerContainer);
  const rows = useMemo(
    () =>
      tracked
        .map((s) => ({ s, need: restockNeed(s, dailyUnits(s, intakes, today), today, horizon) }))
        .filter((r): r is { s: (typeof r)['s']; need: NonNullable<(typeof r)['need']> } => r.need !== null)
        .sort((a, b) => a.need.runOutOn.localeCompare(b.need.runOutOn)),
    [tracked, intakes, today, horizon],
  );
  const total = rows.reduce((n, r) => n + (r.need.cost ?? 0), 0);
  const unpriced = rows.filter((r) => r.need.cost == null).length;

  return (
    <Sheet open onClose={onClose} title="Restock planner">
      <div className="planner">
        <p className="muted small">What you need to buy so nothing runs out in the next…</p>
        <div className="segmented" role="radiogroup" aria-label="Plan ahead">
          {HORIZONS.map((h) => (
            <button key={h} role="radio" aria-checked={horizon === h} className={cx(horizon === h && 'on')} onClick={() => setHorizon(h)}>
              {h} days
            </button>
          ))}
        </div>

        {!tracked.length ? (
          <Empty icon={<IconCheck width={28} height={28} />} title="No stock tracked">
            <p>Turn on “Track how much I have left” for a supplement and the planner will tell you what to buy.</p>
          </Empty>
        ) : !rows.length ? (
          <Empty icon={<IconCheck width={28} height={28} />} title="You're covered">
            <p>Everything you track lasts at least {horizon} more days.</p>
          </Empty>
        ) : (
          <>
            <ul className="plain planner-list">
              {rows.map(({ s, need }) => (
                <li key={s.id} className="planner-row">
                  <Avatar s={s} size={40} />
                  <span className="grow">
                    <b>{s.name}</b>
                    <span className="muted small block">
                      {need.runOutOn <= today ? 'Out now' : `Runs out ${formatDay(need.runOutOn, { month: 'short', day: 'numeric' })}`}
                    </span>
                  </span>
                  <span className="planner-qty">
                    <b>{need.containers}×</b>
                    <span className="muted small block">{need.cost != null ? money(need.cost, settings.currency) : 'no price'}</span>
                  </span>
                  <span className="planner-actions">
                    {/^https?:\/\//.test(s.link) && (
                      <a className="icon-btn" href={s.link} target="_blank" rel="noreferrer noopener" aria-label={`Shop for ${s.name}`} title="Open shop link">
                        <IconLink width={18} height={18} />
                      </a>
                    )}
                    <button
                      className="btn small"
                      onClick={async () => {
                        await restock(s.id, need.containers);
                        toast(`Added ${need.containers} × ${s.name}`, { label: 'Undo', run: () => restock(s.id, -need.containers) });
                      }}
                    >
                      Bought
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="planner-total">
              <span>
                Estimated total
                {unpriced > 0 && <span className="muted small block">{unpriced} item{unpriced > 1 ? 's have' : ' has'} no price</span>}
              </span>
              <b>{money(total, settings.currency)}</b>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
