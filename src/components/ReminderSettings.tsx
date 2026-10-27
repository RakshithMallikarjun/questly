import { DEFAULT_QUIET, leadOf, perQuestOn, quietOf } from '../game/reminders';
import type { Reminders } from '../game/types';
import { strings } from '../i18n';
import { enableNotifications, isIOS, isStandalone, show, useNotify } from '../notify';
import { useStore } from '../store';
import { syncConfigured, useSync } from '../sync';
import { SwitchRow } from './Switch';

const LEADS = [15, 30, 60, 120];
const leadLabel = (n: number) => (n < 60 ? `${n} min before` : n === 60 ? '1 hour before' : `${n / 60} hours before`);

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
    status = <p className="muted small">{isIOS() && !isStandalone() ? t.iosInstall : t.unsupported}</p>;
  } else if (permission === 'denied') {
    status = <p className="muted small">{t.blocked}</p>;
  } else if (permission === 'default') {
    status = <button className="btn btn-gold" onClick={() => void enableNotifications()}>{t.enable}</button>;
  } else {
    status = (
      <>
        <div className="set-row">
          <span className="grow small" style={{ color: 'var(--green)' }}>{t.enabled}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => void show('Questly', t.testBody, 'test')}>{t.test}</button>
        </div>
        {!push && !(syncConfigured && user) && <p className="muted tiny">{t.needSignIn}</p>}
      </>
    );
  }

  return (
    <>
      <div className="card stack">{status}</div>

      <h3 className="label-caps muted">{t.fixed}</h3>
      <div className="card stack" style={{ gap: 4 }}>
        <SwitchRow label="Morning" hint="Your next quest" on={r.morning !== null} onChange={(v) => set({ morning: v ? '08:00' : null })}>
          {r.morning !== null && <input className="time-sm" type="time" aria-label={`${t.morning} time`} value={r.morning} onChange={(e) => set({ morning: e.target.value || '08:00' })} />}
        </SwitchRow>
        <div className="divider" />
        <SwitchRow label="Evening" hint="Check-in" on={r.evening !== null} onChange={(v) => set({ evening: v ? '20:30' : null })}>
          {r.evening !== null && <input className="time-sm" type="time" aria-label={`${t.evening} time`} value={r.evening} onChange={(e) => set({ evening: e.target.value || '20:30' })} />}
        </SwitchRow>
      </div>

      <h3 className="label-caps muted">Per quest</h3>
      <div className="card stack" style={{ gap: 4 }}>
        <SwitchRow label={t.perQuest} hint={t.perQuestHelp} on={perQuestOn(r)} onChange={(v) => set({ perQuest: v })} />
        {perQuestOn(r) && (
          <>
            <div className="divider" />
            <div className="set-row">
              <span className="grow">{t.lead}</span>
              <select style={{ width: 'auto', height: 40, borderRadius: 12, fontSize: 15 }} value={leadOf(r)} onChange={(e) => set({ lead: Number(e.target.value) })}>
                {LEADS.map((n) => <option key={n} value={n}>{leadLabel(n)}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      <h3 className="label-caps muted">{t.quiet}</h3>
      <div className="card stack" style={{ gap: 4 }}>
        <SwitchRow label={t.quiet} hint="No notifications during these hours" on={quiet !== null} onChange={(v) => set({ quiet: v ? DEFAULT_QUIET : null })} />
        {quiet && (
          <>
            <div className="divider" />
            <div className="set-row">
              <span className="grow">{t.quietFrom}</span>
              <input className="time-sm" type="time" aria-label={t.quietFrom} value={quiet.from} onChange={(e) => set({ quiet: { ...quiet, from: e.target.value || DEFAULT_QUIET.from } })} />
            </div>
            <div className="set-row">
              <span className="grow">{t.quietTo}</span>
              <input className="time-sm" type="time" aria-label={t.quietTo} value={quiet.to} onChange={(e) => set({ quiet: { ...quiet, to: e.target.value || DEFAULT_QUIET.to } })} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
