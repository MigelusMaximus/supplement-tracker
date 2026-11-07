import { useLayoutEffect, useRef, useState } from 'react';
import type { DayStat } from '../domain/adherence';
import { formatDay, weekday } from '../domain/dates';
import { cx } from './format';

function bin(s: DayStat, today: string): number {
  if (s.expected === 0) return -1;
  const r = s.taken / s.expected;
  if (r === 1) return 4;
  if (s.date === today && r < 1) return r === 0 ? -2 : Math.min(3, Math.ceil(r * 3)); // in progress
  if (r === 0) return 0;
  return r < 0.5 ? 1 : r < 0.8 ? 2 : 3;
}

const BIN_LABEL = ['None taken', 'Under 50%', '50–79%', '80–99%', 'All taken'];

export function Heatmap({ stats, today }: { stats: DayStat[]; today: string }) {
  const [hover, setHover] = useState<{ s: DayStat; x: number; y: number } | null>(null);
  // Pad to start on Monday so rows are weekdays.
  const lead = (weekday(stats[0].date) + 6) % 7;
  const cells: (DayStat | null)[] = [...Array(lead).fill(null), ...stats];
  const weeks = Math.ceil(cells.length / 7);
  const size = weeks <= 6 ? 26 : weeks <= 14 ? 18 : 12;
  const gap = weeks <= 14 ? 4 : 3;
  // Long ranges overflow on small screens: start scrolled to the most recent week.
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [weeks]);
  const w = weeks * (size + gap);
  const h = 7 * (size + gap);
  const months: { x: number; label: string }[] = [];
  for (let col = 0; col < weeks; col++) {
    const week = cells.slice(col * 7, col * 7 + 7).filter((c): c is DayStat => !!c);
    const first = col === 0 ? week[0] : week.find((c) => c.date.endsWith('-01'));
    if (first && (!months.length || col - months[months.length - 1].x >= 3))
      months.push({ x: col, label: formatDay(first.date, { month: 'short' }) });
  }

  return (
    <div className="heatmap-wrap" onMouseLeave={() => setHover(null)}>
      <div className="heatmap-scroll" ref={scroller}>
        <svg width={w + 24} height={h + 18} role="img" aria-label="Calendar of daily completion">
          {months.map((m) => (
            <text key={m.x} x={24 + m.x * (size + gap)} y={10} className="axis-label">
              {m.label}
            </text>
          ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <text key={d} x={0} y={18 + i * 2 * (size + gap) + size / 2 + 4} className="axis-label">
              {d}
            </text>
          ))}
          {cells.map((c, i) =>
            c ? (
              <rect
                key={c.date}
                x={24 + Math.floor(i / 7) * (size + gap)}
                y={18 + (i % 7) * (size + gap)}
                width={size}
                height={size}
                rx={size > 16 ? 5 : 3}
                className={cx('hm', `b${bin(c, today)}`, c.date === today && 'is-today')}
                onMouseEnter={(e) => {
                  const box = scroller.current!.parentElement!.getBoundingClientRect();
                  const r = e.currentTarget.getBoundingClientRect();
                  setHover({ s: c, x: Math.min(Math.max(r.left - box.left + r.width / 2, 64), box.width - 64), y: r.top - box.top });
                }}
                aria-label={tipText(c)}
              />
            ) : null,
          )}
        </svg>
      </div>
      {hover && (
        <div className="tip" style={{ left: hover.x, top: hover.y }}>
          <b>{formatDay(hover.s.date, { weekday: 'short', month: 'short', day: 'numeric' })}</b>
          <span>{hover.s.expected ? `${hover.s.taken} of ${hover.s.expected} doses` : 'Nothing scheduled'}</span>
          {hover.s.skipped > 0 && <span className="muted">{hover.s.skipped} skipped</span>}
        </div>
      )}
      <div className="hm-legend" aria-hidden>
        <span className="muted small">Less</span>
        {[0, 1, 2, 3, 4].map((b) => (
          <span key={b} className={`hm-key b${b}`} title={BIN_LABEL[b]} />
        ))}
        <span className="muted small">More</span>
      </div>
    </div>
  );
}

const tipText = (s: DayStat) =>
  `${s.date}: ${s.expected ? `${s.taken}/${s.expected} doses` : 'nothing scheduled'}${s.skipped ? `, ${s.skipped} skipped` : ''}`;
