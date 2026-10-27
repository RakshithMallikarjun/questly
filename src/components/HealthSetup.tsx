import { newHealthKey } from '../game/health';
import { useStore } from '../store';

const SHORTCUT_URL = `${import.meta.env.BASE_URL}questly-health.shortcut`;
const SHORTCUT_NAME = 'Questly Health';

/** Runs the shortcut with your key, which it saves for its later automatic runs. */
const connectUrl = (key: string) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(key)}`;

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
  const last = Object.keys(health).sort().at(-1);
  const h = last ? health[last] : null;

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
          <span className="label-caps muted">On your iPhone</span>
          <Step n={1} title="Add the Questly Health shortcut">
            <span className="muted small">
              Tap below and choose <b>Download</b>. Then tap the ↓ arrow next to the address bar, open <b>Questly Health</b> and tap <b>Add Shortcut</b>.
            </span>
            <a className="btn btn-pink btn-sm" href={SHORTCUT_URL} download="Questly Health.shortcut" target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>Get the shortcut</a>
          </Step>
          <Step n={2} title="Connect it to Questly">
            <span className="muted small">
              Tap below. The Shortcuts app opens and runs it once. Allow access to Health and to save a file. Then come back here to see today's numbers.
            </span>
            <a className="btn btn-gold btn-sm" href={connectUrl(key)} style={{ textDecoration: 'none' }}>Connect</a>
          </Step>
          <Step n={3} title="Make it automatic">
            <span className="muted small">
              In Shortcuts, open <b>Automation</b> → <b>+</b> → <b>Time of Day</b>. Pick 9:00 PM, Daily, choose <b>Run Immediately</b>, then pick "Questly Health". Add a second one at 7:00 AM to send last night's sleep early.
            </span>
          </Step>
        </div>
      )}

      {key && (
        <button className="btn btn-text btn-sm" onClick={() => confirm('Make a new key? You will need to tap Connect again.') && updateProfile({ healthKey: newHealthKey() })}>
          Make a new key
        </button>
      )}
    </>
  );
}
