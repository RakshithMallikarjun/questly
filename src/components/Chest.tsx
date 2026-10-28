import { useState } from 'react';
import { useStore } from '../store';
import { burst, buzz, chime, isCalm } from '../fx';
import { Coin, Shield, Star } from './Icon';
import { Modal } from './Modal';

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

/** The chest on Today once the day is cleared: a card, or the main button when nothing else is left. */
export function ChestCard({ hero = false }: { hero?: boolean }) {
  const [opening, setOpening] = useState(false);
  const ready = useStore((s) => !!s.game.today?.cleared && !s.game.today.chest);
  return (
    <>
      {ready && (hero ? (
        <button className="btn btn-gold btn-block chest-hero" onClick={() => setOpening(true)} data-tour="chest">
          <span className="chest-bob"><ChestArt size={34} /></span> Open your mystery chest
        </button>
      ) : (
        <button className="chest-card" onClick={() => setOpening(true)} data-tour="chest">
          <span className="chest-bob"><ChestArt size={52} /></span>
          <span className="grow" style={{ textAlign: 'left' }}>
            <b style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, display: 'block' }}>Your mystery chest is ready</b>
            <span className="soft small">Your streak is safe for today. Tap to open.</span>
          </span>
        </button>
      ))}
      {opening && <ChestOpen onClose={() => setOpening(false)} />}
    </>
  );
}

function ChestOpen({ onClose }: { onClose: () => void }) {
  const g = useStore((s) => s.game);
  const openChest = useStore((s) => s.openChest);
  const calm = isCalm();
  const [phase, setPhase] = useState<'ready' | 'shake' | 'open'>('ready');
  const chest = g.today?.chest;

  const reveal = () => {
    if (phase === 'open') return;
    openChest();
    setPhase('open');
    burst(true);
    chime(g.profile.sound, [523, 659, 784, 1046]);
    buzz(g.profile.vibrate, [40, 50, 90]);
  };
  const tap = () => (phase === 'ready' && !calm ? setPhase('shake') : reveal());

  return (
    <Modal label="Mystery chest" onClose={onClose}>
      <div className="celebrate" style={{ justifyContent: 'center', margin: '0 auto' }}>
        <span className="label-caps" style={{ color: 'var(--gold)', letterSpacing: 3, fontSize: 14 }}>Mystery chest</span>
        <button
          className={`chest-big ${phase}`}
          onClick={tap}
          onAnimationEnd={() => phase === 'shake' && reveal()}
          aria-label={phase === 'open' ? 'Chest opened' : 'Open the chest'}
          autoFocus
          data-autofocus
        >
          <ChestArt size={190} open={phase === 'open'} />
        </button>
        <div role="status" className="stack" style={{ alignItems: 'center' }}>
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
            <p className="soft">{phase === 'shake' ? 'Opening...' : 'Tap the chest to open it'}</p>
          )}
        </div>
        {phase === 'open' ? (
          <button className="btn btn-gold btn-block" style={{ marginTop: 24 }} onClick={onClose} autoFocus data-autofocus>Awesome!</button>
        ) : (
          <button className="btn btn-text" style={{ marginTop: 24 }} onClick={onClose}>Not now</button>
        )}
      </div>
    </Modal>
  );
}
