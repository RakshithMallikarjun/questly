import { useState } from 'react';
import type { MouseEvent } from 'react';
import { addDays } from '../game/date';
import { newHealthKey } from '../game/health';
import { fmt, strings } from '../i18n';
import { useStore } from '../store';
import { deleteHealthInbox } from '../sync';

// Shared from the Shortcuts app (iCloud link), which iPhones open reliably.
// The signed file in public/ is the same shortcut, kept as a backup.
const SHORTCUT_URL = 'https://www.icloud.com/shortcuts/4df29f250bad4962aea399b0df505100';
const SHORTCUT_NAME = 'Questly Health';

/** Runs the shortcut, which sends today's Health numbers using its saved key. */
export const HEALTH_SYNC_URL = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;

/** True when Health is set up but no numbers arrived for the last 2 days. */
export const healthStale = (key: string | undefined, health: Record<string, unknown>, today: string) => {
  if (!key) return false;
  const last = Object.keys(health).sort().at(-1);
  return !last || last < addDays(today, -1);
};

/** Runs the shortcut with your key, which it saves for its later automatic runs. */
const connectUrl = (key: string) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(key)}`;

/** Apple Health only works through the Shortcuts app on iPhone (and iPad). */
export const isIPhone = () =>
  typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

/** What is sent where, shown before Connect. */
export function HealthNotice() {
  return <p className="small soft health-notice">{strings().health.notice}</p>;
}

/** The key for the shortcut, made the first time it's needed. */
const useHealthKey = () => {
  const key = useStore((s) => s.game.profile.healthKey);
  const updateProfile = useStore((s) => s.updateProfile);
  const ensure = () => {
    const current = useStore.getState().game.profile.healthKey;
    if (current) return current;
    const k = newHealthKey();
    updateProfile({ healthKey: k });
    return k;
  };
  return { key, ensure };
};

/** "Get the shortcut" and "Connect": used in Profile and at the end of setup. */
export function HealthConnectSteps() {
  const t = strings().health;
  const { key, ensure } = useHealthKey();
  // Connect needs the key in its link; make one first if there is none yet.
  const connect = (e: MouseEvent<HTMLAnchorElement>) => {
    if (key) return;
    e.preventDefault();
    window.location.href = connectUrl(ensure());
  };
  return (
    <>
      <Step n={1} title="Add the Questly Health shortcut">
        <span className="muted small">
          Tap below, then <b>Get Shortcut</b> and <b>Add Shortcut</b>. Then come back to Questly.
        </span>
        <a className="btn btn-pink btn-sm" href={SHORTCUT_URL} target="_blank" rel="noopener" style={{ textDecoration: 'none' }} aria-label={t.getLabel} onClick={() => ensure()}>{t.get}</a>
      </Step>
      <Step n={2} title="Connect it to Questly">
        <span className="muted small">
          Tap below. The Shortcuts app opens and runs it once (it must be named <b>Questly Health</b>). Allow access to Health and to save a file. If it says "Authorization not determined", open the Health app → your profile → Apps → Shortcuts → Turn On All, then tap Connect again. Then come back here to see today's numbers.
        </span>
        <a className="btn btn-gold btn-sm" href={key ? connectUrl(key) : SHORTCUT_URL} style={{ textDecoration: 'none' }} aria-label={t.connectLabel} onClick={connect}>{t.connect}</a>
      </Step>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
      <span style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--display)' }}>{n}</span>
      <div className="stack grow" style={{ gap: 6, minWidth: 0 }}>
        <b>{title}</b>
        {children}
      </div>
    </div>
  );
}

/** Profile page that connects Apple Health through an iPhone Shortcut. */
export function HealthSetup() {
  const key = useStore((s) => s.game.profile.healthKey);
  const health = useStore((s) => s.game.health);
  const updateProfile = useStore((s) => s.updateProfile);
  const t = strings().health;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const last = Object.keys(health).sort().at(-1);
  const h = last ? health[last] : null;

  // Deletes the cloud copy, then forgets the key. Health history already in Questly stays.
  const disconnect = async () => {
    if (!key || !confirm(t.disconnectConfirm)) return;
    setBusy(true);
    try {
      const result = await deleteHealthInbox(key);
      updateProfile({ healthKey: undefined });
      setNote(result === 'queued' ? t.disconnectQueued : t.disconnected);
    } catch (e) {
      setNote(fmt(t.disconnectFailed, { error: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  // A new key leaves the old inbox behind, so delete it (best effort).
  const newKey = () => {
    if (!key || !confirm('Make a new key? You will need to tap Connect again.')) return;
    void deleteHealthInbox(key).catch(() => undefined);
    updateProfile({ healthKey: newHealthKey() });
  };

  return (
    <>
      <div className="card stack">
        <p className="soft small">
          Steps, sleep and workout minutes from your iPhone's Health app tick off matching quests for you, like "Walk 10,000 steps". Your other phone gets them through sync.
        </p>
        <HealthNotice />
        {h && last && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="muted tiny" style={{ width: '100%' }}>Last data: {new Date(`${last}T12:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            {h.steps !== undefined && <span className="xp-pill" style={{ background: 'var(--green)' }}>{h.steps.toLocaleString()} steps</span>}
            {h.sleepHours !== undefined && <span className="xp-pill" style={{ background: 'var(--purple)', color: '#fff' }}>{h.sleepHours} h sleep</span>}
            {h.workoutMinutes !== undefined && <span className="xp-pill" style={{ background: 'var(--blue)' }}>{h.workoutMinutes} min workout</span>}
          </div>
        )}
        {h && <a className="btn btn-ghost btn-sm" href={HEALTH_SYNC_URL} style={{ textDecoration: 'none' }}>Sync now</a>}
      </div>

      {!key ? (
        <button className="btn btn-gold" onClick={() => updateProfile({ healthKey: newHealthKey() })}>Set up Apple Health</button>
      ) : (
        <div className="card stack" style={{ gap: 18 }}>
          <span className="label-caps muted">On your iPhone</span>
          <HealthConnectSteps />
          <Step n={3} title="Make it automatic (one time)">
            <span className="muted small">iPhone only lets you set this up yourself. It takes about a minute:</span>
            <ol className="small soft" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              <li>Open the <b>Shortcuts</b> app and tap <b>Automation</b> at the bottom.</li>
              <li>Tap <b>+</b> (top right), then <b>Time of Day</b>.</li>
              <li>Set the time to <b>9:00 PM</b>, keep <b>Daily</b>, and choose <b>Run Immediately</b>. Tap <b>Next</b>.</li>
              <li>Pick <b>Questly Health</b>. Done!</li>
            </ol>
            <span className="muted tiny">Tip: add a second one at 7:00 AM so last night's sleep arrives in the morning. Missed a day? Tap Sync now.</span>
          </Step>
        </div>
      )}

      {key && (
        <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-text btn-sm" onClick={newKey}>Make a new key</button>
          <button className="btn btn-ghost btn-sm" onClick={() => void disconnect()} disabled={busy}>{t.disconnect}</button>
        </div>
      )}
      {note && <p className="small soft" role="status">{note}</p>}
    </>
  );
}
