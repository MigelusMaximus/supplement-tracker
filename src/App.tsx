import { useEffect, useState } from 'react';
import { blankSupplement } from './db';
import { loadExampleStack } from './seed';
import { cx } from './ui/format';
import { IconHelp, IconInsights, IconSettings, IconStack, IconToday } from './ui/Icons';
import { ToastProvider, useToast } from './ui/toast';
import { useData } from './ui/useData';
import { Detail } from './views/Detail';
import { Editor } from './views/Editor';
import { Guide } from './views/Guide';
import { Insights } from './views/Insights';
import { RestockPlanner } from './views/RestockPlanner';
import { SettingsView } from './views/SettingsView';
import { Stack } from './views/Stack';
import { Today } from './views/Today';

const TABS = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'stack', label: 'Stack', Icon: IconStack },
  { id: 'insights', label: 'Insights', Icon: IconInsights },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
  { id: 'guide', label: 'Guide', Icon: IconHelp },
] as const;
type Tab = (typeof TABS)[number]['id'];

const tabFromHash = (): Tab => {
  const h = location.hash.slice(1);
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'today';
};

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

function Shell() {
  const data = useData();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(tabFromHash);
  // At most one sheet is open: a supplement's detail, its editor, or the restock planner.
  const [detail, setDetail] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; back?: boolean } | null>(null);
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  const go = (t: Tab) => {
    history.replaceState(null, '', `#${t}`);
    setTab(t);
    scrollTo({ top: 0 });
  };

  const open = (id: string) => setDetail(id);
  const add = () => setEditing({ id: null });
  const plan = () => setPlanning(true);
  const closeEditor = () => {
    // Return to the detail sheet the editor was opened from (unless it was deleted).
    if (editing?.back && editing.id && data.supplements.some((s) => s.id === editing.id)) setDetail(editing.id);
    setEditing(null);
  };
  const loadExample = async () => {
    await loadExampleStack();
    toast('Example stack loaded. Erase it any time in Settings.');
    go('today');
  };

  const existing = editing?.id ? data.supplements.find((s) => s.id === editing.id) : undefined;
  const detailed = detail ? data.supplements.find((s) => s.id === detail) : undefined;

  return (
    <div className="app">
      <nav className="tabbar" aria-label="Main">
        <div className="brand" aria-hidden>
          <span className="brand-mark">
            <IconStack width={18} height={18} />
          </span>
          <span>Supplements</span>
        </div>
        {TABS.map(({ id, label, Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className={cx('tab', tab === id && 'on')}
            aria-current={tab === id ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              go(id);
            }}
          >
            <Icon />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <main className="content">
        {!data.ready ? null : tab === 'today' ? (
          <Today data={data} onOpen={open} onAdd={add} onLoadExample={loadExample} onPlan={plan} />
        ) : tab === 'stack' ? (
          <Stack data={data} onOpen={open} onAdd={add} onPlan={plan} />
        ) : tab === 'insights' ? (
          <Insights data={data} onOpen={open} onPlan={plan} />
        ) : tab === 'settings' ? (
          <SettingsView data={data} onLoadExample={loadExample} onGuide={() => go('guide')} />
        ) : (
          <Guide hasData={data.supplements.length > 0} onLoadExample={loadExample} onAdd={add} go={go} />
        )}
      </main>

      {detailed && !editing && (
        <Detail
          key={detailed.id}
          s={detailed}
          data={data}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing({ id: detailed.id, back: true });
            setDetail(null);
          }}
        />
      )}
      {editing && (editing.id === null || existing) && (
        <Editor key={editing.id ?? 'new'} initial={existing ?? blankSupplement(data.today)} isNew={!existing} data={data} onClose={closeEditor} />
      )}
      {planning && <RestockPlanner data={data} onClose={() => setPlanning(false)} />}
    </div>
  );
}
