import { useEffect, useState } from 'react';
import { swapsFor } from '../game/engine';
import type { Habit } from '../game/types';
import { strings } from '../i18n';
import { useStore } from '../store';
import { burst, chime } from '../fx';

export function UrgeBreaker({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const resist = useStore((s) => s.resist);
  const sound = useStore((s) => s.game.profile.sound);
  const t = strings();
  const [left, setLeft] = useState(120);
  const swaps = swapsFor(habit);
  const [swap] = useState(() => swaps[Math.floor(Math.random() * swaps.length)]);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // 4 seconds in, 4 seconds out, matching the breathing animation.
  const phase = Math.floor((120 - left) / 4) % 2 === 0 ? t.quit.breatheIn : t.quit.breatheOut;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <div className="overlay center" onClick={onClose}>
      <div className="sheet" style={{ borderRadius: 28, margin: 16, alignItems: 'center', textAlign: 'center' }} role="dialog" aria-modal="true" aria-label={t.quit.urgeTitle} onClick={(e) => e.stopPropagation()}>
        <span className="label-caps" style={{ color: 'var(--pink)' }}>{t.quit.urgeTitle} · {mm}</span>
        <h2>{habit.name}</h2>
        <div className="breathe" aria-live="polite">{phase}</div>
        <p className="soft">{t.quit.orSwap} {swap}</p>
        <button
          className="btn btn-green btn-block"
          onClick={() => {
            resist(habit.id);
            burst();
            chime(sound, [523, 659, 784]);
            onClose();
          }}
        >
          {t.quit.resisted}
        </button>
        <button className="btn btn-text" onClick={onClose}>{t.quit.close}</button>
      </div>
    </div>
  );
}
