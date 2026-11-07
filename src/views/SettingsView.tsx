import { useRef, useState } from 'react';
import { importBackup, updateSettings, wipeAll } from '../db';
import { backupAge, backupIsRecent, downloadBackup } from '../ui/backup';
import type { Settings } from '../domain/types';
import { cx } from '../ui/format';
import { useToast } from '../ui/toast';
import type { AppData } from '../ui/useData';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CZK', 'PLN', 'CHF', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'HUF', 'JPY'];

export function SettingsView({ data, onLoadExample, onGuide }: { data: AppData; onLoadExample: () => void; onGuide: () => void }) {
  const { settings, supplements, intakes } = data;
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const set = (patch: Partial<Settings>) => updateSettings(patch);

  async function download() {
    await downloadBackup();
    toast('Backup downloaded');
  }

  async function upload(f: File) {
    try {
      await importBackup(JSON.parse(await f.text()));
      toast('Backup restored');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file');
    }
  }

  const currencies = CURRENCIES.includes(settings.currency) ? CURRENCIES : [settings.currency, ...CURRENCIES];

  return (
    <div className="view narrow-view">
      <header className="view-head">
        <h1>Settings</h1>
      </header>

      <section className="card settings">
        <h2 className="card-title">Preferences</h2>
        <label className="setting">
          <span>
            Currency
            <small>Used for prices and spending</small>
          </span>
          <select value={settings.currency} onChange={(e) => set({ currency: e.target.value })}>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="setting">
          <span>Appearance</span>
          <div className="segmented small" role="radiogroup" aria-label="Appearance">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button key={t} role="radio" aria-checked={settings.theme === t} className={cx(settings.theme === t && 'on')} onClick={() => set({ theme: t })}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <label className="setting">
          <span>
            Daily check-in
            <small>Rate energy, mood and sleep on Today, so the app can tell what's working</small>
          </span>
          <input type="checkbox" className="toggle" checked={settings.checkIns} onChange={(e) => set({ checkIns: e.target.checked })} />
        </label>
        <label className="setting">
          <span>
            Low-stock warning
            <small>Warn when a supplement will run out within this many days</small>
          </span>
          <span className="suffix">
            <input type="number" min={1} max={90} value={settings.lowStockDays} onChange={(e) => set({ lowStockDays: Math.max(1, Number(e.target.value) || 1) })} />
            <span>days</span>
          </span>
        </label>
      </section>

      <section className="card settings">
        <h2 className="card-title">Your data</h2>
        <p className="card-sub">
          Everything is stored on this device only: {supplements.length} supplements, {intakes.length} doses and {data.checkIns.length} check-ins. Download a backup now and then, or to move to another device.
        </p>
        <p className={backupIsRecent(settings.lastBackupAt) ? 'small muted' : 'small strong'}>{backupAge(settings.lastBackupAt)}</p>
        <div className="row gap-s wrap">
          <button className="btn" onClick={download}>
            Download backup
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            Restore from backup…
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = '';
            }}
          />
          {!supplements.length && (
            <button className="btn" onClick={onLoadExample}>
              Load example stack
            </button>
          )}
        </div>
        <p className="muted small">Restoring replaces everything currently on this device.</p>
      </section>

      <section className="card settings">
        <h2 className="card-title">Danger zone</h2>
        {confirmWipe ? (
          <div className="row gap-s wrap">
            <span>Erase all supplements, history and settings?</span>
            <button
              className="btn danger"
              onClick={async () => {
                await wipeAll();
                setConfirmWipe(false);
                toast('All data erased');
              }}
            >
              Erase everything
            </button>
            <button className="btn ghost" onClick={() => setConfirmWipe(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn ghost danger-text" onClick={() => setConfirmWipe(true)}>
            Erase all data…
          </button>
        )}
      </section>

      <p className="muted small center pad">
        Supplement Tracker · works offline · no account, no tracking.
        <br />
        This is a logbook, not medical advice.
        <br />
        <button className="link-btn" onClick={onGuide}>
          How to use this app
        </button>
      </p>
    </div>
  );
}
