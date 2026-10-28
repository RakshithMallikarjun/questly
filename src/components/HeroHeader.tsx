import { useEffect, useRef, useState } from 'react';
import { buddyLine, moodFor, outfitFor, speciesFor, stageForLevel } from '../game/content/buddy';
import type { Mood } from '../game/content/buddy';
import { levelFor, titleFor } from '../game/xp';
import { strings } from '../i18n';
import { useStore } from '../store';
import { buzz, useFx } from '../fx';
import { Buddy } from './Buddy';
import { Coin, Flame, Shield } from './Icon';

/** Your companion, dressed and in its current mood. */
export function Avatar({ size = 52, mood, still }: { id?: string; name?: string; size?: number; mood?: Mood; still?: boolean }) {
  const g = useStore((s) => s.game);
  const cheerAt = useFx((s) => s.cheerAt);
  const [, force] = useState(0);
  const cheering = Date.now() - cheerAt < 1800;
  useEffect(() => {
    if (!cheering) return;
    const id = setTimeout(() => force((n) => n + 1), 1800 - (Date.now() - cheerAt));
    return () => clearTimeout(id);
  }, [cheering, cheerAt]);
  const m = mood ?? (cheering ? 'cheer' : moodFor(g, new Date()));
  return (
    <Buddy
      species={speciesFor(g.profile.avatar)}
      stage={stageForLevel(levelFor(g.xp).level)}
      mood={m}
      outfit={outfitFor(g)}
      size={size}
      still={still}
    />
  );
}

/** Counts smoothly from the old value to the new one. */
export function useCountUp(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || document.documentElement.classList.contains('calm')) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const v = Math.round(start + (value - start) * (1 - (1 - k) ** 3));
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export function HeroHeader() {
  const g = useStore((s) => s.game);
  const cheer = useFx((s) => s.cheer);
  const t = strings();
  const xp = useCountUp(g.xp);
  const coins = useCountUp(g.coins);
  const lv = levelFor(xp);
  const [line, setLine] = useState<string | null>(null);
  const taps = useRef(0);
  const streak = g.streak.current;
  const weeks = Math.floor(streak / 7);
  const flame = streak ? Math.min(30, 22 + weeks * 2) : 22;

  useEffect(() => {
    if (!line) return;
    const id = setTimeout(() => setLine(null), 2600);
    return () => clearTimeout(id);
  }, [line]);

  const tapBuddy = () => {
    const mood = moodFor(g, new Date());
    setLine(buddyLine(g, mood, taps.current++));
    cheer();
    buzz(g.profile.vibrate, 15);
  };

  return (
    <>
      <div className="hero-row">
        <button className="buddy-tile" onClick={tapBuddy} aria-label="Your companion. Tap to say hi." data-tour="buddy">
          <Avatar size={64} />
          {line && <span className="speech" role="status">{line}</span>}
        </button>
        <div className="grow stack" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 6, alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600 }}>{t.common.level} {lv.level}</span>
            <span className="muted small">{titleFor(lv.level)}</span>
          </div>
          <div className="bar bar-xp" role="progressbar" aria-valuenow={lv.into} aria-valuemax={lv.need} aria-label="XP to next level">
            <span style={{ width: `${Math.round((lv.into / lv.need) * 100)}%` }} />
          </div>
          <span className="muted tiny">{lv.into} / {lv.need} XP</span>
        </div>
      </div>
      <div className="chips3" data-tour="stats">
        <div className="chip-stat" aria-label={`${streak} ${t.common.dayStreak}`}>
          <span className={`flame-wrap ${streak ? 'lit' : ''} ${weeks >= 2 ? 'hot' : ''}`} style={{ width: 30, height: 30 }}><Flame size={flame} /></span>
          <div><b>{streak}</b><span className="muted">streak</span></div>
        </div>
        <div className="chip-stat" aria-label={`${g.coins} ${t.common.coins}`} data-fx="coins">
          <Coin size={22} />
          <div><b>{coins}</b><span className="muted">{t.common.coins}</span></div>
        </div>
        <div className="chip-stat" aria-label={`${g.streak.shields} ${t.common.shields}`}>
          <Shield size={22} />
          <div><b>{g.streak.shields}</b><span className="muted">{t.common.shields}</span></div>
        </div>
      </div>
    </>
  );
}
