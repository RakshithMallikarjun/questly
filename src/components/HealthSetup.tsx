import { useState } from 'react';
import { newHealthKey } from '../game/health';
import { useStore } from '../store';
import { Icon } from './Icon';

const SHORTCUT_URL = `${import.meta.env.BASE_URL}questly-health.shortcut`;

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
  const [copied, setCopied] = useState(false);
  const last = Object.keys(health).sort().at(-1);
  const h = last ? health[last] : null;

  const copy = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt('Copy your Questly key:', key);
    }
  };

  return (
    <>
      <div className="card stack">
        <p className="soft small">
          Steps, sleep and workout minutes from your iPhone's Health app tick off matching quests for you, like "Walk 10,000 steps". Your other phone gets them through sync.
        </p>
        {h && last && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="muted tiny" style={{ width: '100%' }}>Last data: {new Date(`${last}T12:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            {h.steps !== undefined && <span className="xp-pill" style={{ background: 'var(--green)' }}>{h.steps.toLocaleString()} steps</span>}
            {h.sleepHours !== undefined && <span className="xp-pill" style={{ background: 'var(--purple)', color: '#fff' }}>{h.sleepHours} h sleep</span>}
            {h.workoutMinutes !== undefined && <span className="xp-pill" style={{ background: 'var(--blue)' }}>{h.workoutMinutes} min workout</span>}
          </div>
        )}
      </div>

      {!key ? (
        <button className="btn btn-gold" onClick={() => updateProfile({ healthKey: newHealthKey() })}>Set up Apple Health</button>
      ) : (
        <div className="card stack" style={{ gap: 18 }}>
          <span className="label-caps muted">On your iPhone, in Safari</span>
          <Step n={1} title="Copy your Questly key">
            <button className="btn btn-ghost btn-sm" onClick={() => void copy()}>
              <Icon name={copied ? 'check' : 'download'} size={18} /> {copied ? 'Copied!' : 'Copy key'}
            </button>
          </Step>
          <Step n={2} title="Add the Questly Health shortcut">
            <span className="muted small">Tap below, then "Add Shortcut". When it asks for your key, paste it.</span>
            <a className="btn btn-pink btn-sm" href={SHORTCUT_URL} style={{ textDecoration: 'none' }}>Get the shortcut</a>
          </Step>
          <Step n={3} title="Run it once">
            <span className="muted small">In the Shortcuts app, tap "Questly Health" and allow access to Health. Come back here and you'll see today's numbers.</span>
          </Step>
          <Step n={4} title="Make it automatic">
            <span className="muted small">
              In Shortcuts, open <b>Automation</b> → <b>+</b> → <b>Time of Day</b>. Pick 9:00 PM, Daily, choose <b>Run Immediately</b>, then pick "Questly Health". Add a second one at 7:00 AM to send last night's sleep early.
            </span>
          </Step>
        </div>
      )}

      {key && (
        <button className="btn btn-text btn-sm" onClick={() => confirm('Make a new key? You will need to add the shortcut again.') && updateProfile({ healthKey: newHealthKey() })}>
          Make a new key
        </button>
      )}
    </>
  );
}
