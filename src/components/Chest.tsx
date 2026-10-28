import { useState } from 'react';
import { useStore } from '../store';
import { burst, buzz, chime, isCalm } from '../fx';
import { Coin, Shield, Star } from './Icon';

/** The treasure chest drawing. `open` lifts the lid. */
export function ChestArt({ size = 96, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={`chest-art ${open ? 'open' : ''}`}>
      {open && (
        <g className="chest-rays" fill="#FFE08A" opacity="0.7">
          {[0, 30, 60, 90, 120, 150].map((a) => <path key={a} d="M50 48 L45 4 L55 4 Z" transform={`rotate(${a - 75} 50 48)`} />)}
        </g>
      )}
      <rect x="14" y="48" width="72" height="40" rx="8" fill="#B5652B" />
      <rect x="14" y="48" width="72" height="10" fill="#8E4A1C" />
      <rect x="44" y="48" width="12" height="40" fill="#FFC23D" />
      <rect x="18" y="80" width="64" height="5" rx="2" fill="#8E4A1C" opacity="0.5" />
      <g className="chest-lid">
        <path d="M14 50 V38 Q14 20 50 20 Q86 20 86 38 V50 Z" fill="#D27A35" />
        <path d="M44 21 H56 V50 H44 Z" fill="#FFC23D" />
        <path d="M14 44 H86 V50 H14 Z" fill="#8E4A1C" />
      </g>
      <rect x="43" y="44" width="14" height="14" rx="4" fill="#FFE08A" stroke="#C98A0B" strokeWidth="2" />
      <circle cx="50" cy="51" r="2" fill="#8E4A1C" />
    </svg>
  );
}

/** On Today once the day is cleared: the chest card, then the opening moment. */
export function ChestCard() {
  const [opening, setOpening] = useState(false);
  const ready = useStore((s) => !!s.game.today?.cleared && !s.game.today.chest);
  return (
    <>
      {ready && <button className="chest-card" onClick={() => setOpening(true)} data-tour="chest">
        <span className="chest-bob"><ChestArt size={64} /></span>
        <span className="grow" style={{ textAlign: 'left' }}>
          <b style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, display: 'block' }}>Mystery chest unlocked!</b>
          <span className="soft small">You cleared the day. Tap to open your reward.</span>
        </span>
      </button>}
      {opening && <ChestOpen onClose={() => setOpening(false)} />}
    </>
  );
}

function ChestOpen({ onClose }: { onClose: () => void }) {
  const g = useStore((s) => s.game);
  const openChest = useStore((s) => s.openChest);
  const [phase, setPhase] = useState<'shake' | 'open'>('shake');
  const chest = g.today?.chest;

  const reveal = () => {
    if (phase === 'open') return;
    openChest();
    setPhase('open');
    burst(true);
    chime(g.profile.sound, [523, 659, 784, 1046]);
    buzz(g.profile.vibrate, [40, 50, 90]);
  };

  return (
    <div className="overlay center" role="dialog" aria-modal="true" aria-label="Mystery chest">
      <div className="celebrate" style={{ justifyContent: 'center' }}>
        <span className="label-caps" style={{ color: 'var(--gold)', letterSpacing: 3, fontSize: 14 }}>Mystery chest</span>
        <button
          className={`chest-big ${phase}`}
          onClick={reveal}
          onAnimationEnd={() => phase === 'shake' && reveal()}
          aria-label="Open the chest"
          style={isCalm() ? { animation: 'none' } : undefined}
        >
          <ChestArt size={190} open={phase === 'open'} />
        </button>
        {phase === 'open' && chest ? (
          <div className="stack" style={{ alignItems: 'center', animation: 'pop-in 0.4s cubic-bezier(.2,.9,.3,1.3)' }}>
            <div className="row" style={{ gap: 10 }}>
              {chest.reward === 'coins' ? <Coin size={40} /> : chest.reward === 'shield' ? <Shield size={40} /> : <Star size={40} color="#FFC23D" />}
              <span style={{ fontFamily: 'var(--display)', fontSize: 40, color: 'var(--gold)' }}>
                {chest.reward === 'coins' ? `+${chest.amount} coins` : chest.reward === 'shield' ? 'Streak shield!' : `+${chest.amount} XP`}
              </span>
            </div>
            <p className="soft">
              {chest.reward === 'shield' ? 'It protects your streak on a day you miss.' : 'Come back tomorrow for another chest.'}
            </p>
          </div>
        ) : (
          <p className="soft">Tap the chest to open it</p>
        )}
        {phase === 'open' && <button className="btn btn-gold btn-block" style={{ marginTop: 24 }} onClick={onClose} autoFocus>Awesome!</button>}
      </div>
    </div>
  );
}
