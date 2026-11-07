import { useState, type ReactNode } from 'react';
import type { Effect } from '../domain/effects';
import { TIERS, TIER_ORDER, type Supplement } from '../domain/types';
import { EffectView } from '../ui/Effect';
import { cx } from '../ui/format';
import {
  IconAlert,
  IconBox,
  IconCheck,
  IconChevR,
  IconFlame,
  IconFood,
  IconInsights,
  IconPhone,
  IconPlus,
  IconSettings,
  IconSkip,
  IconSlot,
  IconStack,
  IconToday,
} from '../ui/Icons';
import { Avatar, TierBadge } from '../ui/parts';

type Go = (tab: 'today' | 'stack' | 'insights' | 'settings') => void;

const SECTIONS = [
  { id: 'start', title: 'Quick start', Icon: IconPlus },
  { id: 'today', title: 'Your daily checklist', Icon: IconToday },
  { id: 'working', title: 'Is it working?', Icon: IconFlame },
  { id: 'adding', title: 'Adding a supplement', Icon: IconStack },
  { id: 'stock', title: 'Stock & cost', Icon: IconBox },
  { id: 'insights', title: 'Reading your insights', Icon: IconInsights },
  { id: 'data', title: 'Your data & backups', Icon: IconSettings },
  { id: 'install', title: 'Install on your phone', Icon: IconPhone },
  { id: 'faq', title: 'Questions', Icon: IconAlert },
] as const;

export function Guide({ hasData, onLoadExample, onAdd, go }: { hasData: boolean; onLoadExample: () => void; onAdd: () => void; go: Go }) {
  const jump = (id: string) => document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="view guide">
      <header className="guide-hero">
        <span className="eyebrow">Guide</span>
        <h1>How to use Supplement Tracker</h1>
        <p>
          Tell the app what you take and when. Each day it gives you a checklist, and while you tick things off it keeps track of your streak, your stock and
          what it all costs.
        </p>
      </header>

      <nav className="guide-toc" aria-label="Guide contents">
        {SECTIONS.map(({ id, title, Icon }, i) => (
          <button key={id} onClick={() => jump(id)}>
            <span className="toc-num">{i + 1}</span>
            <Icon width={18} height={18} />
            <span>{title}</span>
          </button>
        ))}
      </nav>

      {/* ---------------------------------------------------------------- */}
      <Section id="start" n={1} title="Quick start" lead="Three steps, about two minutes.">
        <ol className="steps">
          <li>
            <b>Add what you take.</b> Go to <Kbd>Stack</Kbd> and press <Kbd>+ Add</Kbd>. Only the name is required. Pick a time of day and you're done.
          </li>
          <li>
            <b>Tick doses off.</b> Open <Kbd>Today</Kbd> and tap the circle next to each supplement as you take it.
          </li>
          <li>
            <b>Optional: add stock and price.</b> Tell the app how many pills you have and what a container costs. It will warn you before you run out and show your monthly spend.
          </li>
        </ol>
        <div className="row gap-s wrap">
          <button className="btn primary" onClick={onAdd}>
            <IconPlus /> Add a supplement
          </button>
          {!hasData && (
            <button className="btn" onClick={onLoadExample}>
              Try the example stack
            </button>
          )}
        </div>
        {!hasData && (
          <Tip>The example stack fills the app with seven supplements and two months of history, so you can see every screen working. Erase it any time in Settings.</Tip>
        )}
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="today" n={2} title="Your daily checklist" lead="The Today screen lists every dose that's due, grouped by time of day.">
        <Figure caption="One dose per row. Tap the circle when you've taken it.">
          <div className="mock-slot">
            <IconSlot slot="morning" /> Morning
          </div>
          <MockDose s={EX.d3} meta="1 softgel · 2000 IU" food state="taken" />
          <MockDose s={EX.omega} meta="2 softgels · 1000 mg EPA+DHA" food state="open" callout />
          <MockDose s={EX.b12} meta="1 tablet · 1000 mcg" state="skipped" />
        </Figure>

        <div className="legend-grid">
          <Legend icon={<span className="check on mini"><IconCheck /></span>} title="Taken">
            Tap the circle. Tap it again if you made a mistake and it's undone, with the pills returned to your stock.
          </Legend>
          <Legend icon={<span className="icon-btn mini-skip"><IconSkip /></span>} title="Skipped">
            Use this when you leave a dose out on purpose (say, a rest day). It's recorded, but it still counts as not taken.
          </Legend>
          <Legend icon={<span className="check mini" />} title="Not done yet">
            Doses you haven't ticked. Leaving them open is fine, and you can fill in past days later.
          </Legend>
          <Legend icon={<IconFood />} title="With food">
            A reminder that this one should be taken with a meal.
          </Legend>
        </div>

        <h3 className="guide-h3">The top of the screen</h3>
        <Figure>
          <div className="today-summary mock">
            <MockRing value={0.6} />
            <div>
              <div className="big">
                3<span className="muted"> / 5</span>
              </div>
              <div className="muted small">doses taken</div>
            </div>
            <div className="streak">
              <IconFlame />
              <b>12</b>
              <span className="muted small">day streak</span>
            </div>
            <span className="btn take-all">
              <IconCheck width={18} height={18} /> Take the remaining 2
            </span>
          </div>
        </Figure>
        <ul className="bullets">
          <li>
            <b>The ring</b> fills as you take your doses and shows a check mark once the day is complete.
          </li>
          <li>
            <b>The streak</b> counts days in a row on which you took <em>every</em> scheduled dose. Today doesn't break it while it's still in progress.
          </li>
          <li>
            <b>The arrows</b> beside the date step to other days, so you can log yesterday if you forgot.
          </li>
          <li>
            <b>Take all</b>, under the ring, ticks every dose still open that day in one tap. Doses you skipped on purpose and as-needed ones are left alone, and the message that pops up lets you undo it.
          </li>
          <li>
            <b>Now</b> marks the time of day you're in. A group shows <b>Done</b> once everything in it is taken.
          </li>
        </ul>
        <Tip>Tap a supplement's name (not the circle) to open its page: its own history calendar, stock, cost, whether it seems to be working, and an Edit button.</Tip>
        <GoLink onClick={() => go('today')}>Open Today</GoLink>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="working" n={3} title="Is it working?" lead="The question that matters for every supplement, especially Experimental ones.">
        <p>
          At the bottom of Today there's a short check-in: rate your <b>energy</b>, <b>mood</b> and <b>last night's sleep</b> from 1 to 5 by tapping a face. It takes ten seconds, and
          you can skip any of them.
        </p>
        <Figure caption="One tap per row. Tap the same face again to clear it.">
          <div className="rating">
            <span className="rating-label">Last night’s sleep</span>
            <div className="rating-scale">
              {['😫', '😕', '😐', '🙂', '😄'].map((f, i) => (
                <span key={f} className={cx('face', i === 3 ? 'on' : 'dim')}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </Figure>
        <p>After a couple of weeks, each supplement's page (and Insights) compares how you felt <b>with</b> it against <b>without</b> it:</p>
        <Figure>
          <EffectView effect={EXAMPLE_EFFECT} />
        </Figure>
        <dl className="defs">
          <dt>Before vs since</dt>
          <dd>Used when you checked in for at least 5 days before you started the supplement. Best for slow-acting things that take weeks to work.</dd>
          <dt>Taken vs missed</dt>
          <dd>Otherwise, days you took it are compared with days it was due but you missed it. Sleep is matched to the dose taken the night before.</dd>
        </dl>
        <ul className="bullets">
          <li>
            The hollow dot is <em>without</em>, the filled dot is <em>with</em>. The number on the right is the difference on the 1–5 scale.
          </li>
          <li>
            <b>▲</b> means better, <b>▼</b> means worse, and <b>≈</b> means no clear change: either the difference is under 0.3 points, or your ratings vary so much day to day that it could easily be chance. More check-ins make the answer sharper.
          </li>
          <li>Start a new Experimental supplement on its own, not alongside two others, so you can tell which one is doing what.</li>
        </ul>
        <Tip>It's a pattern, not proof. A stressful month or a change of season moves the numbers too. Use it to ask better questions, and talk to a professional before changing anything important.</Tip>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="adding" n={4} title="Adding a supplement" lead="In Stack, press + Add. Here's what each part of the form means.">
        <h3 className="guide-h3">Priority tier</h3>
        <p>Tiers sort your stack by how much each supplement matters to you. They only organise the list and never change your schedule.</p>
        <div className="tier-cards">
          {TIER_ORDER.map((t) => (
            <div key={t} className="tier-card">
              <TierBadge tier={t} long />
              <span className="muted small">{TIERS[t].hint}</span>
              <span className="small">{TIER_EXAMPLE[t]}</span>
            </div>
          ))}
        </div>
        <Tip>Tiers come in handy when money is tight: the Insights screen shows how much each tier costs per month, so you can see what Experimental is really costing you.</Tip>

        <h3 className="guide-h3">How often</h3>
        <dl className="defs">
          <dt>Daily</dt>
          <dd>Every day.</dd>
          <dt>Some days</dt>
          <dd>Pick the weekdays, e.g. Monday, Wednesday and Friday, or weekdays only.</dd>
          <dt>Every N days</dt>
          <dd>Every second, third… day, counting from a start date you choose.</dd>
          <dt>As needed</dt>
          <dd>
            Taken only when you want it (sleep aids, pain relief, travel). It shows under <em>As needed</em> on Today but <b>never counts against your streak or adherence</b>.
          </dd>
        </dl>

        <h3 className="guide-h3">Time of day &amp; amount</h3>
        <p>Tick one or more times (morning, midday, evening, bedtime), then use <Kbd>−</Kbd> and <Kbd>+</Kbd> to set how many units you take each time. If you take 2 capsules in the morning and 1 at night, tick both times and set each amount.</p>
        <Figure>
          <div className="slot-row on mock-row">
            <span className="check-label">
              <input type="checkbox" checked readOnly tabIndex={-1} /> <IconSlot slot="morning" /> Morning
            </span>
            <span className="stepper">
              <span className="icon-btn">−</span>
              <span>2 capsules</span>
              <span className="icon-btn">+</span>
            </span>
          </div>
          <div className="slot-row on mock-row">
            <span className="check-label">
              <input type="checkbox" checked readOnly tabIndex={-1} /> <IconSlot slot="bedtime" /> Bedtime
            </span>
            <span className="stepper">
              <span className="icon-btn">−</span>
              <span>1 capsule</span>
              <span className="icon-btn">+</span>
            </span>
          </div>
        </Figure>

        <h3 className="guide-h3">The rest</h3>
        <ul className="bullets">
          <li>
            <b>Form</b> (capsule, powder, liquid…) sets the unit word the app uses: "scoops" for powders, "ml" for liquids.
          </li>
          <li>
            <b>Strength</b> is free text for your own reference, like "500 mg per capsule".
          </li>
          <li>
            <b>Photo:</b> tap the round picture to snap the bottle, so it's easy to spot.
          </li>
          <li>
            <b>Where to buy</b> stores a shop link so reordering takes one tap.
          </li>
          <li>
            <b>Counting from</b> is the day the supplement starts counting in your stats. Set it back if you've been taking it for a while.
          </li>
        </ul>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="stock" n={5} title="Stock & cost" lead="Turn on “Track how much I have left” in the editor and fill in three numbers.">
        <div className="formula">
          <div>
            <span className="muted small">Units left</span>
            <b>48</b>
          </div>
          <div>
            <span className="muted small">Per container</span>
            <b>90</b>
          </div>
          <div>
            <span className="muted small">Container price</span>
            <b>24.50</b>
          </div>
        </div>
        <p className="center muted small">↓ the app works out ↓</p>
        <div className="calc">
          <div>
            <span className="muted small">Per softgel</span>
            <b>0.27</b>
          </div>
          <div>
            <span className="muted small">Per month</span>
            <b>16.57</b>
          </div>
          <div>
            <span className="muted small">Lasts</span>
            <b>24 days</b>
          </div>
        </div>
        <p className="muted small">Example: 2 softgels a day. 24.50 ÷ 90 = 0.27 per softgel · 0.27 × 2 × 30.4 days ≈ 16.57 a month · 48 ÷ 2 = 24 days left.</p>

        <ul className="bullets">
          <li>
            <b>It counts down by itself.</b> Every dose you tick takes the right number of units off your stock, and unticking puts them back.
          </li>
          <li>
            <b>Running low.</b> When a supplement has fewer days left than your warning threshold (10 days by default, changeable in Settings), a yellow box appears on Today.
          </li>
          <li>
            <b>Restocking.</b> When you open a new bottle, press <Kbd>Restock</Kbd> on Today or <Kbd>Opened a new container</Kbd> in the editor. One full container gets added.
          </li>
          <li>
            <b>Fixing the count.</b> If the number drifts (spilled pills, a forgotten tick), type the real count into <em>Units left</em>.
          </li>
          <li>
            <b>Restock planner.</b> In Stack, press <Kbd>Restock plan</Kbd> (or <em>Plan an order</em> in the yellow box). Choose 30, 60 or 90 days and it lists how many containers of each to
            buy, what it'll cost and a shop link. Press <Kbd>Bought</Kbd> when the order arrives and the stock is added.
          </li>
        </ul>
        <Figure caption="The meter on each Stack card shows days of supply.">
          <div className="mock-meters">
            {(
              [
                ['ok', 80, '2 months left'],
                ['low', 9, '6 days left'],
                ['out', 0, 'Out of stock'],
              ] as const
            ).map(([lvl, w, label]) => (
              <div key={lvl} className="stock">
                <span className={cx('meter', lvl)}>
                  <span style={{ width: `${Math.max(lvl === 'out' ? 0 : 4, w)}%` }} />
                </span>
                <span className="small">{label}</span>
              </div>
            ))}
          </div>
        </Figure>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="insights" n={6} title="Reading your insights" lead="Switch between 30 days, 90 days and 1 year at the top.">
        <dl className="defs">
          <dt>Adherence</dt>
          <dd>The share of scheduled doses you actually took. Today is left out until it's over, so the number doesn't drop every morning.</dd>
          <dt>Best streak</dt>
          <dd>Your longest run of complete days within the chosen period.</dd>
        </dl>
        <h3 className="guide-h3">The calendar</h3>
        <p>Each square is one day and each column is one week, Monday at the top. Darker means more of that day's doses were taken. Hover over or tap a square to see the exact count.</p>
        <Figure>
          <div className="hm-legend big-legend">
            {[
              ['b0', 'None'],
              ['b1', 'Under 50%'],
              ['b2', '50–79%'],
              ['b3', '80–99%'],
              ['b4', 'All taken'],
            ].map(([b, label]) => (
              <span key={b} className="hm-legend-item">
                <span className={`hm-key ${b}`} />
                <span className="small">{label}</span>
              </span>
            ))}
            <span className="hm-legend-item">
              <span className="hm-key outline" />
              <span className="small">Nothing due</span>
            </span>
          </div>
        </Figure>
        <h3 className="guide-h3">The other charts</h3>
        <ul className="bullets">
          <li>
            <b>By supplement</b> puts your least consistent supplements at the top. If an Experimental one always sits there, maybe it isn't worth it.
          </li>
          <li>
            <b>Monthly cost by tier</b> splits your monthly spending across the four tiers, plus a yearly estimate.
          </li>
          <li>
            <b>Is it working?</b> collects the with-vs-without results for every supplement in one place, biggest differences first.
          </li>
          <li>
            <b>Stock runway</b> lists everything you track, soonest to run out first, with the date. Handy for planning one combined order.
          </li>
        </ul>
        <GoLink onClick={() => go('insights')}>Open Insights</GoLink>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="data" n={7} title="Your data & backups" lead="Everything stays on this device. There's no account, no cloud and no tracking.">
        <div className="callout-card">
          <IconAlert />
          <div>
            <b>Make a backup now and then.</b> Your data lives in this browser. Clearing site data, uninstalling the browser or losing the phone will lose it too.
          </div>
        </div>
        <ul className="bullets">
          <li>
            <b>Back up:</b> Settings → <Kbd>Download backup</Kbd> saves one small <code>.json</code> file. Keep it in your cloud drive or email it to yourself.
          </li>
          <li>
            <b>Move to a new phone or computer:</b> download a backup on the old device, then use Settings → <Kbd>Restore from backup</Kbd> on the new one.
          </li>
          <li>
            <b>Restoring replaces</b> everything currently on the device; it doesn't merge.
          </li>
          <li>
            <b>Reminder:</b> if you haven't backed up for 30 days, Today shows a small reminder. <em>Later</em> hides it for a week.
          </li>
        </ul>
        <GoLink onClick={() => go('settings')}>Open Settings</GoLink>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="install" n={8} title="Install on your phone" lead="Add it to your home screen and it opens like a normal app, offline too.">
        <div className="platforms">
          <div className="platform">
            <h4>iPhone / iPad</h4>
            <ol>
              <li>Open the app in <b>Safari</b>.</li>
              <li>
                Tap the <b>Share</b> button (square with an arrow).
              </li>
              <li>
                Choose <b>Add to Home Screen</b>.
              </li>
            </ol>
          </div>
          <div className="platform">
            <h4>Android</h4>
            <ol>
              <li>Open the app in <b>Chrome</b>.</li>
              <li>
                Tap the <b>⋮</b> menu.
              </li>
              <li>
                Choose <b>Install app</b> (or <b>Add to Home screen</b>).
              </li>
            </ol>
          </div>
          <div className="platform">
            <h4>Computer</h4>
            <ol>
              <li>Open it in Chrome, Edge or Brave.</li>
              <li>
                Click the <b>install</b> icon at the right end of the address bar.
              </li>
            </ol>
          </div>
        </div>
        <Tip>Data doesn't sync between devices. Pick one main device, usually your phone, and use backups to move data.</Tip>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="faq" n={9} title="Questions" lead="">
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <Faq key={q} q={q}>
              {a}
            </Faq>
          ))}
        </div>
      </Section>

      <p className="muted small center pad">This app is a logbook, not medical advice. Talk to a doctor or pharmacist about what you take.</p>
    </div>
  );
}

// ---------------------------------------------------------------- content

const TIER_EXAMPLE: Record<keyof typeof TIERS, string> = {
  S: 'e.g. something your doctor prescribed, or a confirmed deficiency',
  A: 'e.g. creatine for training, magnesium for sleep',
  B: 'e.g. a general multivitamin',
  C: 'e.g. something new you’re testing for a few weeks',
};

const FAQ: [string, ReactNode][] = [
  ['I forgot to tick yesterday. Can I fix it?', 'Yes. On Today, press the left arrow next to the date to go back, then tick what you took. Your streak and stats update right away.'],
  [
    'What’s the difference between Archive and Delete?',
    <>
      <b>Archive</b> takes a supplement out of your daily list but keeps its history, so past stats stay correct and you can bring it back any time. <b>Delete</b> removes the supplement <em>and</em> its whole history. Use Archive when you stop taking something.
    </>,
  ],
  ['Does skipping break my streak?', 'Yes. A streak only counts days where every scheduled dose was taken. Skipping simply records that you left it out on purpose rather than forgot.'],
  ['Why isn’t my as-needed supplement in my streak?', 'On purpose. You choose when to take as-needed items, so missing one isn’t a failure. They still count against your stock, and their run-out forecast uses your last 30 days of use.'],
  ['I take a supplement in two different doses at different times.', 'Tick both times of day in the editor and set the amount for each separately, e.g. 2 capsules in the morning and 1 at bedtime.'],
  ['Can I turn off the daily check-in?', 'Yes. Go to Settings → Daily check-in. Without check-ins, “Is it working?” has nothing to compare.'],
  ['I restocked by mistake.', 'Use Undo in the message that appears, or open the supplement, press Edit and type the correct count into Units left.'],
  ['The currency is wrong.', 'Change it in Settings. It only changes the symbol; prices aren’t converted.'],
  ['Can I use it on several devices at once?', 'Not with live syncing. Each device keeps its own data. Move data between them with Download backup and Restore from backup.'],
  ['Does it send reminders?', 'Not yet. A browser app can’t reliably send notifications at set times without a server. Many people pin it next to their alarm or open it with their morning coffee.'],
];

// ---------------------------------------------------------------- pieces

function Section({ id, n, title, lead, children }: { id: string; n: number; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={`guide-${id}`} className="card guide-section">
      <header className="guide-section-head">
        <span className="toc-num big-num">{n}</span>
        <div>
          <h2>{title}</h2>
          {lead && <p className="card-sub">{lead}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

const Kbd = ({ children }: { children: ReactNode }) => <span className="kbd">{children}</span>;

function Tip({ children }: { children: ReactNode }) {
  return (
    <p className="tip-box">
      <b>Tip</b> {children}
    </p>
  );
}

function Figure({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="figure" aria-hidden={!caption}>
      <div className="figure-inner">{children}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Legend({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="legend-item">
      <span className="legend-icon">{icon}</span>
      <div>
        <b>{title}</b>
        <p>{children}</p>
      </div>
    </div>
  );
}

function GoLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="link-btn go-link" onClick={onClick}>
      {children} <IconChevR width={16} height={16} />
    </button>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cx('faq-item', open && 'open')}>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <IconChevR width={18} height={18} />
      </button>
      {open && <div className="faq-a">{children}</div>}
    </div>
  );
}

const EXAMPLE_EFFECT: Effect = {
  mode: 'takenVsMissed',
  withLabel: 'Days taken',
  withoutLabel: 'Days missed',
  rows: [
    { metric: 'energy', withAvg: 3.4, withoutAvg: 3.3, withN: 31, withoutN: 9, delta: 0.1, se: 0.3 },
    { metric: 'mood', withAvg: 3.2, withoutAvg: 3.1, withN: 31, withoutN: 9, delta: 0.1, se: 0.3 },
    { metric: 'sleep', withAvg: 4.1, withoutAvg: 2.9, withN: 31, withoutN: 9, delta: 1.2, se: 0.3 },
  ],
};

const mk = (name: string, tier: Supplement['tier']): Pick<Supplement, 'name' | 'tier' | 'image'> => ({ name, tier, image: null });
const EX = { d3: mk('Vitamin D3', 'S'), omega: mk('Omega-3', 'S'), b12: mk('Vitamin B12', 'B') };

function MockDose({ s, meta, food, state, callout }: { s: ReturnType<typeof mk>; meta: string; food?: boolean; state: 'taken' | 'open' | 'skipped'; callout?: boolean }) {
  return (
    <div className={cx('dose', state === 'taken' && 'is-taken', state === 'skipped' && 'is-skipped')}>
      <span className="dose-main">
        <Avatar s={s} />
        <span className="dose-text">
          <span className="dose-name">
            {s.name} <TierBadge tier={s.tier} />
          </span>
          <span className="dose-meta">
            {meta}
            {food && (
              <>
                {' '}
                · <IconFood width={14} height={14} /> with food
              </>
            )}
          </span>
        </span>
      </span>
      {state !== 'taken' && (
        <span className={cx('icon-btn skip-btn', state === 'skipped' && 'active')}>
          <IconSkip />
        </span>
      )}
      <span className={cx('check', state === 'taken' && 'on', callout && 'pulse')}>
        <IconCheck />
      </span>
      {callout && <span className="callout-tag">tap here</span>}
    </div>
  );
}

function MockRing({ value }: { value: number }) {
  const r = 26,
    c = 2 * Math.PI * r;
  return (
    <svg className="ring" width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} className="ring-track" />
      <circle cx="32" cy="32" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform="rotate(-90 32 32)" />
    </svg>
  );
}
