import { useEffect, useRef, useState } from 'react';
import { buddyLine, moodFor, outfitFor, speciesFor, stageForLevel } from '../game/content/buddy';
import type { Mood } from '../game/content/buddy';
import { levelFor, titleFor } from '../game/xp';
import { strings } from '../i18n';
import { useStore } from '../store';
import { buzz, useFx } from '../fx';
import { Buddy } from './Buddy';
import { Coin, Flame } from './Icon';

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

/** One slim row: companion, level ring, streak and coins. Tap any of them for details. */
export function HeroHeader() {
  const g = useStore((s) => s.game);
  const cheer = useFx((s) => s.cheer);
  const cheerAt = useFx((s) => s.cheerAt);
  const cheerText = useFx((s) => s.line);
  const t = strings();
  const xp = useCountUp(g.xp);
  const coins = useCountUp(g.coins);
  const lv = levelFor(xp);
  const [tip, setTip] = useState<{ text: string; at: number; right?: number } | null>(null);
  const taps = useRef(0);
  const streak = g.streak.current;
  const weeks = Math.floor(streak / 7);
  const flame = streak ? Math.min(28, 20 + weeks * 2) : 20;
  const pct = lv.into / lv.need;

  // The companion's cheer after a quest shows in the same bubble.
  useEffect(() => {
    if (cheerText) setTip({ text: cheerText, at: cheerAt });
  }, [cheerText, cheerAt]);

  useEffect(() => {
    if (!tip) return;
    const id = setTimeout(() => setTip(null), 3200);
    return () => clearTimeout(id);
  }, [tip]);

  const say = (text: string, right?: number) => setTip({ text, at: Date.now(), right });
  const tapBuddy = () => {
    say(buddyLine(g, moodFor(g, new Date()), taps.current++));
    cheer();
    buzz(g.profile.vibrate, 15);
  };
  const shields = g.streak.shields;

  return (
    <div className="hero-slim">
      <button className="buddy-tile" onClick={tapBuddy} aria-label="Your companion. Tap to say hi." data-tour="buddy">
        <Avatar size={46} />
      </button>
      <button
        className="level-ring"
        onClick={() => say(`Level ${lv.level} ${titleFor(lv.level)}. ${lv.need - lv.into} XP to level ${lv.level + 1}.`)}
        aria-label={`${t.common.level} ${lv.level}, ${titleFor(lv.level)}. ${lv.into} of ${lv.need} XP.`}
      >
        <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
          <circle cx="23" cy="23" r="19" fill="none" stroke="var(--card-2)" strokeWidth="5" />
          <circle cx="23" cy="23" r="19" fill="none" stroke="var(--green)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${Math.max(0.02, pct) * 119.4} 119.4`} transform="rotate(-90 23 23)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <span className="lv-num">{lv.level}</span>
      </button>
      <div className="grow" style={{ minWidth: 0, lineHeight: 1.15 }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titleFor(lv.level)}</div>
        <div className="muted tiny">{lv.into}/{lv.need} XP</div>
      </div>
      <button
        className="pill-stat"
        onClick={() => say(streak ? `${streak}-day streak. ${shields ? `${shields} shield${shields === 1 ? '' : 's'} can cover a missed day.` : 'Shields from 7-day streaks can cover a missed day.'}` : 'Clear today to start a streak.', 100)}
        aria-label={`${streak} ${t.common.dayStreak}, ${shields} ${t.common.shields}`}
      >
        <span className={`flame-wrap ${streak ? 'lit' : ''} ${weeks >= 2 ? 'hot' : ''}`} style={{ width: 24, height: 24 }}><Flame size={flame} /></span>
        <b>{streak}</b>
      </button>
      <button className="pill-stat" data-fx="coins" onClick={() => say(`${g.coins} coins. Spend them in Rewards.`, 30)} aria-label={`${g.coins} ${t.common.coins}`}>
        <Coin size={20} />
        <b>{coins}</b>
      </button>
      {tip && <span className={`speech ${tip.right ? 'right' : ''}`} role="status" key={tip.at} style={tip.right ? ({ '--arrow': `${tip.right}px` } as React.CSSProperties) : undefined}>{tip.text}</span>}
    </div>
  );
}
