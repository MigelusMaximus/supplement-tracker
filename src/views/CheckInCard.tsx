import { useState } from 'react';
import { setCheckIn } from '../db';
import { METRICS, METRIC_ORDER, type CheckIn, type Metric } from '../domain/types';
import { cx } from '../ui/format';

const FACES = ['😫', '😕', '😐', '🙂', '😄'];

/** Three one-tap 1–5 ratings plus an optional note. Saves instantly. Render with `key={date}`. */
export function CheckInCard({ date, checkIn, isToday }: { date: string; checkIn?: CheckIn; isToday: boolean }) {
  const ratings = checkIn?.ratings ?? {};
  const [note, setNote] = useState(checkIn?.note ?? '');
  const [noteOpen, setNoteOpen] = useState(!!checkIn?.note);
  const done = METRIC_ORDER.every((m) => ratings[m] != null);

  const rate = (m: Metric, v: number) => {
    const next = { ...ratings };
    if (next[m] === v) delete next[m];
    else next[m] = v;
    void setCheckIn(date, { ratings: next });
  };

  return (
    <section className={cx('card checkin', done && 'done')} aria-label="How do you feel">
      <header className="checkin-head">
        <div>
          <h2 className="card-title">{isToday ? 'How do you feel today?' : 'How did you feel?'}</h2>
          <p className="card-sub">
            {done ? 'Saved. This feeds “Is it working?”.' : 'Ten seconds a day shows which supplements actually make a difference.'}
          </p>
        </div>
        {done && <span className="pill good">✓ Logged</span>}
      </header>
      <div className="ratings">
        {METRIC_ORDER.map((m) => (
          <div key={m} className="rating" role="radiogroup" aria-label={METRICS[m].question}>
            <span className="rating-label">{METRICS[m].question}</span>
            <div className="rating-scale">
              {FACES.map((face, i) => {
                const v = i + 1;
                const on = ratings[m] === v;
                return (
                  <button
                    key={v}
                    role="radio"
                    aria-checked={on}
                    aria-label={`${v} of 5${v === 1 ? ` (${METRICS[m].low})` : v === 5 ? ` (${METRICS[m].high})` : ''}`}
                    className={cx('face', on && 'on', ratings[m] != null && !on && 'dim')}
                    onClick={() => rate(m, v)}
                  >
                    <span aria-hidden>{face}</span>
                  </button>
                );
              })}
            </div>
            <span className="rating-ends small muted" aria-hidden>
              <span>{METRICS[m].low}</span>
              <span>{METRICS[m].high}</span>
            </span>
          </div>
        ))}
      </div>
      {noteOpen ? (
        <label className="field">
          <span>Note</span>
          <textarea
            rows={2}
            value={note}
            placeholder="Anything unusual? Bad night, sick, stressful day…"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (checkIn?.note ?? '') && setCheckIn(date, { note })}
          />
        </label>
      ) : (
        <button className="link-btn small" onClick={() => setNoteOpen(true)}>
          + Add a note
        </button>
      )}
    </section>
  );
}
