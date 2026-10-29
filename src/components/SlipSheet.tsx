import { Modal } from './Modal';
import { useEffect, useRef, useState } from 'react';
import { SLIP_TRIGGERS } from '../game/content/habits';
import { strings } from '../i18n';
import { useStore } from '../store';
import { TipLine } from './TipLine';

export function SlipSheet({ habitId, onClose }: { habitId: string; onClose: () => void }) {
  const slip = useStore((s) => s.slip);
  const day = useStore((s) => s.game.today?.day);
  const t = strings();
  const [logged, setLogged] = useState(false);
  const ok = useRef<HTMLButtonElement>(null);
  const done = (trigger?: string) => {
    slip(habitId, trigger);
    setLogged(true);
  };
  // The list of triggers is gone after logging, so move focus to the way out.
  useEffect(() => {
    if (logged) ok.current?.focus();
  }, [logged]);
  return (
    <Modal bare label={logged ? t.quit.slipLogged : t.quit.slipQuestion} onClose={onClose}><div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {logged ? (
          <>
            <h2>{t.quit.slipLogged}</h2>
            {day && <TipLine day={day} moment="slip" id="slip-tip" />}
            <button ref={ok} className="btn btn-gold" onClick={onClose} aria-describedby={day ? 'slip-tip' : undefined}>{t.quit.slipOk}</button>
          </>
        ) : (
          <>
            <h2>{t.quit.slipQuestion}</h2>
            <p className="muted">{t.quit.slipNote}</p>
            <div className="options">
              {SLIP_TRIGGERS.map((tr) => (
                <button key={tr} className="option" onClick={() => done(tr)}>{tr}</button>
              ))}
            </div>
            <button className="btn btn-text" onClick={onClose}>{t.common.cancel}</button>
          </>
        )}
      </div>
    </div></Modal>
  );
}
