import { useEffect, useLayoutEffect, useState } from 'react';
import { create } from 'zustand';
import { SPECIES, speciesFor } from '../game/content/buddy';
import type { GameState } from '../game/types';
import { useStore } from '../store';
import { Avatar } from './HeroHeader';
import { ChestArt } from './Chest';

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
    { art: 'buddy', title: `Hi ${g.profile.name || 'there'}!`, body: `I'm your ${creature(g)}. Let me show you around Questly. It takes 30 seconds.` },
    { target: '[data-tour="quest"]', title: 'One quest at a time', body: 'This is your next quest. Do it, then tap Done to earn XP and coins. "Not now" saves it for later.' },
    { target: '[data-tour="strip"]', title: "Today's quests", body: 'Each icon is one of today\'s quests, by life area. Tap an icon to jump to that quest. Ticks show what is done.' },
    { target: '[data-tour="stats"]', title: 'Streak, coins, shields', body: 'Finish your quests every day to grow your streak flame. Coins buy rewards you pick yourself. Shields save your streak on a missed day.' },
    { target: '[data-tour="buddy"]', title: "That's me!", body: 'I cheer when you finish quests and grow up as you level up. Tap me any time to say hi.' },
    { target: '.nav button:nth-child(2)', title: 'Break bad habits', body: 'Want to cut down on something? Track it here and get help when you feel tempted.' },
    { target: '.nav button:nth-child(3)', title: 'Your progress', body: 'See your stats, goals, badges and your 66-day habit journey.' },
    { target: '.nav button:nth-child(4)', title: 'Rewards', body: 'Spend coins on treats you choose, like a movie night.' },
    { target: '.nav button:nth-child(5)', title: 'Profile', body: 'Dress me up, set reminders and change your settings here.' },
    { art: 'chest', title: 'One more thing', body: 'Clear the day to open a mystery chest with a surprise reward. Ready for your first quest?' },
  ],
  'new-companion': (g) => [
    { art: 'buddy', title: "What's new: meet your companion!", body: `I'm your ${creature(g)}. I cheer you on, I get sleepy at night, and I grow up as you level up. Tap me any time.` },
    { target: '[data-tour="strip"]', title: 'Jump between quests', body: 'Each icon is one of today\'s quests, by life area. Tap one to jump to it.' },
    { art: 'chest', title: 'Daily mystery chest', body: 'Clear the day to open a chest with coins, XP or a streak shield.' },
    { target: '.nav button:nth-child(5)', title: 'Dress me up', body: 'Hats, glasses and colours unlock at milestones. Pick a different creature in Profile, My companion.' },
  ],
};

/** "What's new" tours, oldest first. New users skip these. */
export const NEWS = ['new-companion'];

export const useTour = create<{ id: string | null; step: number }>(() => ({ id: null, step: 0 }));

export const startTour = (id: string) => {
  if (window.location.hash !== '#/today') window.location.hash = '/today';
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
      ? { top: Math.min(rect.bottom + pad + 12, vh - 240) }
      : { bottom: Math.min(vh - rect.top + pad + 12, vh - 240) }
    : { top: '50%', transform: 'translateY(-50%)' };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={s.title}>
      {rect ? (
        <div className="tour-hole" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-card" style={cardStyle} key={`${id}${step}`}>
        {s.art && (
          <div className="center" style={{ marginTop: -4 }}>
            {s.art === 'buddy' ? <Avatar size={120} mood="cheer" /> : <span className="chest-bob" style={{ display: 'inline-block' }}><ChestArt size={96} /></span>}
          </div>
        )}
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          {!s.art && <span style={{ flexShrink: 0 }}><Avatar size={44} mood="happy" still /></span>}
          <div className="grow stack" style={{ gap: 4 }}>
            <b style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600 }}>{s.title}</b>
            <span className="soft small" style={{ lineHeight: 1.4 }}>{s.body}</span>
          </div>
        </div>
        <div className="between">
          <div className="tour-dots" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((_, i) => <span key={i} className={i === step ? 'on' : ''} />)}
          </div>
          <div className="row" style={{ gap: 4 }}>
            {step === 0 ? (
              <button className="btn btn-text btn-sm" onClick={finish}>Skip</button>
            ) : (
              <button className="btn btn-text btn-sm" onClick={back}>Back</button>
            )}
            <button className="btn btn-gold btn-sm" onClick={next} autoFocus>{step + 1 === steps.length ? "Let's go!" : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
