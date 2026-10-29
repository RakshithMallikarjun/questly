import { useEffect, useLayoutEffect, useState } from 'react';
import { create } from 'zustand';
import { SPECIES, speciesFor } from '../game/content/buddy';
import type { GameState } from '../game/types';
import { useStore } from '../store';
import { Avatar } from './HeroHeader';
import { ChestArt } from './Chest';
import { Modal } from './Modal';

// Guided tours. "welcome" runs once for new users after setup. Each new
// feature gets its own "What's new" tour that runs once for existing users.
// To announce a future feature, add a tour to TOURS and its id to NEWS.

interface Step {
  /** CSS selector of the thing to point at. No target = a centred card. */
  target?: string;
  title: string;
  body: string;
  art?: 'buddy' | 'chest';
}

const creature = (g: GameState) => SPECIES.find((s) => s.id === speciesFor(g.profile.avatar))?.label.toLowerCase() ?? 'buddy';

const TOURS: Record<string, (g: GameState) => Step[]> = {
  welcome: (g) => [
    { art: 'buddy', title: `Hi ${g.profile.name || 'there'}!`, body: `I'm your ${creature(g)}. Here's Questly in 4 quick steps.` },
    { target: '[data-tour="quest"]', title: 'One quest at a time', body: 'This is your next quest. Do it in real life, then come back here.' },
    { target: '[data-tour="done"]', title: 'Tap Done', body: 'You earn XP and coins. Tapped by mistake? Undo shows up right after. Swipe the card to see your other quests, or tap Later to come back to one.' },
    { art: 'chest', title: 'Clear the day, open a chest', body: "Finish most of today's quests to keep your streak and open a mystery chest. Your other tabs are below. I'll give you a tip the first time you open each one." },
  ],
  'new-companion': (g) => [
    { art: 'buddy', title: "What's new: meet your companion!", body: `I'm your ${creature(g)}. I cheer you on and grow up as you level up. Tap me any time.` },
    { target: '[data-tour="strip"]', title: 'Jump between quests', body: "Each icon is one of today's quests. Tap one to jump to it." },
    { art: 'chest', title: 'Daily mystery chest', body: 'Clear the day to open a chest with coins, XP or a streak shield.' },
  ],
};

/** First-visit tips for each tab (shown in the tab, never as a pop-up). */
export const TAB_TIPS: Record<string, string> = {
  quit: "Trying to cut something out? Add it here. When an urge hits, tap \"I'm tempted\" and I'll help you ride it out.",
  progress: 'Your stats, goals, badges and 66-day journey live here.',
  rewards: 'Set your own treats and buy them with the coins you earn.',
  profile: 'Dress me up, set reminders and change your settings here.',
};

/** "What's new" tours, oldest first. New users skip these. */
export const NEWS = ['new-companion'];

export const useTour = create<{ id: string | null; step: number }>(() => ({ id: null, step: 0 }));

/** Start a tour. Only an explicit replay moves you to Today. */
export const startTour = (id: string, goToday = false) => {
  if (goToday && window.location.hash !== '#/today') window.location.hash = '/today';
  useTour.setState({ id, step: 0 });
};

/** The tour this person should see next, if any. */
export const pendingTour = (g: GameState): string | null => {
  if (!g.onboarded) return null;
  const seen = new Set(g.profile.toursSeen ?? []);
  if (!seen.has('welcome')) {
    // Someone who used Questly before this feature existed gets "What's new" instead.
    const isNew = g.totals.quests === 0 && Object.keys(g.history).length <= 1;
    if (isNew) return 'welcome';
  }
  return NEWS.find((id) => !seen.has(id)) ?? null;
};

export function Tour() {
  const { id, step } = useTour();
  const g = useStore((s) => s.game);
  const tourSeen = useStore((s) => s.tourSeen);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const steps = id ? TOURS[id]?.(g) ?? [] : [];
  const s = steps[step];

  useLayoutEffect(() => {
    if (!s?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(s.target);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 60);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [s?.target, id, step]);

  useEffect(() => {
    if (id && !TOURS[id]) useTour.setState({ id: null });
  }, [id]);

  if (!id || !s) return null;

  const finish = () => {
    // New users never need the "What's new" tours of features they just met.
    if (id === 'welcome') NEWS.forEach((n) => tourSeen(n));
    tourSeen(id);
    useTour.setState({ id: null, step: 0 });
    document.querySelector('.screen')?.scrollTo(0, 0);
  };
  const next = () => (step + 1 < steps.length ? useTour.setState({ step: step + 1 }) : finish());
  const back = () => useTour.setState({ step: Math.max(0, step - 1) });

  const pad = 6;
  const vh = window.innerHeight;
  const below = rect ? rect.top + rect.height / 2 < vh / 2 : false;
  const cardStyle: React.CSSProperties = rect
    ? below
      ? { top: Math.min(rect.bottom + pad + 12, vh - 260) }
      : { bottom: Math.min(vh - rect.top + pad + 12, vh - 260) }
    : { top: '50%', transform: 'translateY(-50%)' };

  return (
    <Modal label={`Tour: ${s.title}`} onClose={finish} className="tour">
      {rect ? (
        <div className="tour-hole" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-card" style={cardStyle} key={`${id}${step}`}>
        <div className="between">
          <span className="muted small">Step {step + 1} of {steps.length}</span>
          {step + 1 < steps.length && <button className="btn btn-text btn-sm" style={{ height: 32 }} onClick={finish}>Skip</button>}
        </div>
        {s.art && (
          <div className="center">
            {s.art === 'buddy' ? <Avatar size={110} mood="cheer" /> : <span className="chest-bob" style={{ display: 'inline-block' }}><ChestArt size={90} /></span>}
          </div>
        )}
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          {!s.art && <span style={{ flexShrink: 0 }}><Avatar size={44} mood="happy" still /></span>}
          <div className="grow stack" style={{ gap: 4 }} aria-live="polite">
            <b style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600 }}>{s.title}</b>
            <span className="soft small" style={{ lineHeight: 1.4 }}>{s.body}</span>
          </div>
        </div>
        <div className="between">
          <div className="tour-dots" aria-hidden="true">
            {steps.map((_, i) => <span key={i} className={i === step ? 'on' : ''} />)}
          </div>
          <div className="row" style={{ gap: 4 }}>
            {step > 0 && <button className="btn btn-text btn-sm" onClick={back}>Back</button>}
            <button className="btn btn-gold btn-sm" onClick={next} autoFocus data-autofocus>{step + 1 === steps.length ? "Let's go!" : 'Next'}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** A one-time tip at the top of a tab, for people who took the welcome tour. */
export function TabTip({ tab }: { tab: string }) {
  const seen = useStore((s) => s.game.profile.toursSeen ?? []);
  const tourSeen = useStore((s) => s.tourSeen);
  if (!seen.includes('welcome') || seen.includes(`tip-${tab}`) || !TAB_TIPS[tab]) return null;
  return (
    <div className="card row tab-tip" role="note">
      <span style={{ flexShrink: 0 }}><Avatar size={44} mood="happy" still /></span>
      <span className="soft small grow" style={{ lineHeight: 1.4 }}>{TAB_TIPS[tab]}</span>
      <button className="btn btn-ghost btn-sm" onClick={() => tourSeen(`tip-${tab}`)}>Got it</button>
    </div>
  );
}
