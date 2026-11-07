import { MIN_DAYS, summarize, verdict, type Effect } from '../domain/effects';
import { METRICS } from '../domain/types';
import { cx } from './format';

const VERDICT = {
  better: { icon: '▲', label: 'Better' },
  worse: { icon: '▼', label: 'Worse' },
  same: { icon: '≈', label: 'No clear change' },
};

const pos = (v: number) => `${((v - 1) / 4) * 100}%`;

/** Dumbbell rows: without (hollow) → with (filled) on a 1–5 scale. */
export function EffectView({ effect, compact }: { effect: Effect; compact?: boolean }) {
  const days = Math.max(...effect.rows.map((r) => r.withN + r.withoutN));
  return (
    <div className={cx('effect', compact && 'compact')}>
      <p className="effect-summary">{summarize(effect)}</p>
      {!compact && (
        <div className="effect-legend small">
          <span>
            <i className="dot without" /> {effect.withoutLabel}
          </span>
          <span>
            <i className="dot with" /> {effect.withLabel}
          </span>
        </div>
      )}
      <ul className="plain effect-rows">
        {effect.rows.map((r) => {
          const v = verdict(r);
          const lo = Math.min(r.withAvg, r.withoutAvg);
          const hi = Math.max(r.withAvg, r.withoutAvg);
          return (
            <li key={r.metric} className="effect-row">
              <span className="effect-metric">{METRICS[r.metric].label}</span>
              <span
                className="dumbbell"
                role="img"
                aria-label={`${METRICS[r.metric].label}: ${effect.withoutLabel.toLowerCase()} ${r.withoutAvg.toFixed(1)}, ${effect.withLabel.toLowerCase()} ${r.withAvg.toFixed(1)} out of 5`}
                title={`${effect.withoutLabel}: ${r.withoutAvg.toFixed(1)} (${r.withoutN} days) · ${effect.withLabel}: ${r.withAvg.toFixed(1)} (${r.withN} days)`}
              >
                <span className="db-track" />
                <span className="db-link" style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} />
                <span className="db-dot without" style={{ left: pos(r.withoutAvg) }} />
                <span className="db-dot with" style={{ left: pos(r.withAvg) }} />
              </span>
              <span className={cx('verdict', v)}>
                <span aria-hidden>{VERDICT[v].icon}</span> {r.delta > 0 ? '+' : ''}
                {r.delta.toFixed(1)}
                <span className="sr-only"> {VERDICT[v].label}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {!compact && (
        <p className="muted small effect-note">
          Based on {days} rated days, rated 1–5. This is a pattern, not proof: sleep, stress and season change too. ≈ means the difference is too small, or could easily be chance.
        </p>
      )}
    </div>
  );
}

export function EffectPending({ rated }: { rated: number }) {
  const need = MIN_DAYS * 2;
  return (
    <div className="effect-pending">
      <div className="pending-bar" aria-hidden>
        <span style={{ width: `${Math.min(100, (rated / need) * 100)}%` }} />
      </div>
      <p className="small muted">
        Not enough data yet. Rate how you feel on the Today screen. A comparison needs at least {MIN_DAYS} rated days with this supplement and {MIN_DAYS} without
        it (or before you started).
      </p>
    </div>
  );
}
