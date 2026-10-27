import { DEFAULT_QUIET, leadOf, perQuestOn, quietOf } from '../game/reminders';
import type { Reminders } from '../game/types';
import { strings } from '../i18n';
import { enableNotifications, isIOS, isStandalone, show, useNotify } from '../notify';
import { useStore } from '../store';
import { syncConfigured, useSync } from '../sync';

const LEADS = [15, 30, 60, 120];

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="between" style={{ minHeight: 44 }}>
      <span>{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} style={{ width: 24, height: 24, accentColor: '#3DDC97', flexShrink: 0 }} />
    </label>
  );
}

/** Reminder controls: fixed daily times and per-quest nudges. Used in Profile. */
export function ReminderSettings() {
  const r = useStore((s) => s.game.profile.reminders);
  const updateProfile = useStore((s) => s.updateProfile);
  const { permission, push } = useNotify();
  const user = useSync((s) => s.user);
  const t = strings().remind;
  const set = (patch: Partial<Reminders>) => updateProfile({ reminders: { ...r, ...patch } });
  const quiet = quietOf(r);

  let status: React.ReactNode;
  if (permission === 'unsupported') {
    status = <span className="muted small">{isIOS() && !isStandalone() ? t.iosInstall : t.unsupported}</span>;
  } else if (permission === 'denied') {
    status = <span className="muted small">{t.blocked}</span>;
  } else if (permission === 'default') {
    status = <button className="btn btn-gold" onClick={() => void enableNotifications()}>{t.enable}</button>;
  } else {
    status = (
      <div className="stack" style={{ gap: 6 }}>
        <div className="between">
          <span className="small" style={{ color: 'var(--green)' }}>{t.enabled}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => void show('Questly', t.testBody, 'test')}>{t.test}</button>
        </div>
        {!push && !(syncConfigured && user) && <span className="muted tiny">{t.needSignIn}</span>}
      </div>
    );
  }

  return (
    <>
      {status}

      <Toggle label={t.morning} on={r.morning !== null} onChange={(v) => set({ morning: v ? '08:00' : null })} />
      {r.morning !== null && (
        <input type="time" aria-label={t.morning} value={r.morning} onChange={(e) => set({ morning: e.target.value || '08:00' })} />
      )}
      <Toggle label={t.evening} on={r.evening !== null} onChange={(v) => set({ evening: v ? '20:30' : null })} />
      {r.evening !== null && (
        <input type="time" aria-label={t.evening} value={r.evening} onChange={(e) => set({ evening: e.target.value || '20:30' })} />
      )}

      <Toggle label={t.perQuest} on={perQuestOn(r)} onChange={(v) => set({ perQuest: v })} />
      {perQuestOn(r) && (
        <>
          <span className="muted tiny">{t.perQuestHelp}</span>
          <label className="field">{t.lead}
            <select value={leadOf(r)} onChange={(e) => set({ lead: Number(e.target.value) })}>
              {LEADS.map((n) => <option key={n} value={n}>{n < 60 ? `${n} minutes before` : n === 60 ? '1 hour before' : `${n / 60} hours before`}</option>)}
            </select>
          </label>
        </>
      )}

      <Toggle label={t.quiet} on={quiet !== null} onChange={(v) => set({ quiet: v ? DEFAULT_QUIET : null })} />
      {quiet && (
        <div className="row">
          <label className="field grow">{t.quietFrom}
            <input type="time" value={quiet.from} onChange={(e) => set({ quiet: { ...quiet, from: e.target.value || DEFAULT_QUIET.from } })} />
          </label>
          <label className="field grow">{t.quietTo}
            <input type="time" value={quiet.to} onChange={(e) => set({ quiet: { ...quiet, to: e.target.value || DEFAULT_QUIET.to } })} />
          </label>
        </div>
      )}
    </>
  );
}
