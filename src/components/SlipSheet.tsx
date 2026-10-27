import { SLIP_TRIGGERS } from '../game/content/habits';
import { strings } from '../i18n';
import { useStore } from '../store';

export function SlipSheet({ habitId, onClose }: { habitId: string; onClose: () => void }) {
  const slip = useStore((s) => s.slip);
  const t = strings();
  const done = (trigger?: string) => {
    slip(habitId, trigger);
    onClose();
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t.quit.slipQuestion} onClick={(e) => e.stopPropagation()}>
        <h2>{t.quit.slipQuestion}</h2>
        <p className="muted">{t.quit.slipNote}</p>
        <div className="options">
          {SLIP_TRIGGERS.map((tr) => (
            <button key={tr} className="option" onClick={() => done(tr)}>{tr}</button>
          ))}
        </div>
        <button className="btn btn-text" onClick={onClose}>{t.common.cancel}</button>
      </div>
    </div>
  );
}
