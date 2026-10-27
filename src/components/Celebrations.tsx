import { useEffect } from 'react';
import { BADGE_BY_ID } from '../game/content/badges';
import { levelFor, titleFor } from '../game/xp';
import { useStore } from '../store';
import { burst, buzz, chime } from '../fx';
import { Star } from './Icon';

/** Shows level-ups, badges and other wins, one at a time. */
export function Celebrations() {
  const events = useStore((s) => s.events);
  const pop = useStore((s) => s.popEvent);
  const g = useStore((s) => s.game);
  const e = events[0];
  const big = e && (e.type === 'levelUp' || e.type === 'goal');
  // Several badges at once are shown together in one message.
  let badgeRun = 0;
  while (events[badgeRun]?.type === 'badge') badgeRun += 1;

  useEffect(() => {
    if (!e) return;
    const sound = g.profile.sound;
    if (e.type === 'levelUp' || e.type === 'goal') {
      burst(true);
      chime(sound, [523, 659, 784, 1046]);
      buzz(sound, [40, 60, 40, 60, 120]);
    } else if (e.type === 'dayCleared' || e.type === 'badge') {
      burst();
      chime(sound, [659, 784, 988]);
      buzz(sound, [30, 40, 60]);
    }
    if (!big) {
      const id = setTimeout(() => pop(Math.max(1, badgeRun)), e.type === 'badge' || e.type === 'dayCleared' ? 3000 : 2400);
      return () => clearTimeout(id);
    }
  }, [e, big, pop, badgeRun, g.profile.sound]);

  if (!e) return null;

  if (e.type === 'levelUp') {
    const lv = e.value ?? levelFor(g.xp).level;
    const next = 5 * Math.ceil(lv / 5) + 1;
    return (
      <div className="overlay center" role="dialog" aria-modal="true" aria-label={`Level up to ${lv}`}>
        <div className="celebrate">
          <span className="label-caps" style={{ color: 'var(--green)', letterSpacing: 3, fontSize: 14 }}>Level up!</span>
          <div className="ring"><div>
            <span className="muted small">LEVEL</span>
            <span style={{ fontFamily: 'var(--display)', fontSize: 76, lineHeight: 1, color: 'var(--gold)' }}>{lv}</span>
          </div></div>
          <h1>You're getting stronger, {g.profile.name}</h1>
          <p className="soft">
            {g.streak.current > 1 ? `${g.streak.current} days in a row. ` : ''}
            {lv % 5 === 1 && lv > 1 ? `New title: ${titleFor(lv)}!` : `${next - lv} more ${next - lv === 1 ? 'level' : 'levels'} until you reach the rank of ${titleFor(next)}.`}
          </p>
          <div className="grow" />
          <button className="btn btn-gold btn-block" onClick={() => pop()} autoFocus>Keep going</button>
        </div>
      </div>
    );
  }

  if (e.type === 'goal') {
    return (
      <div className="overlay center" role="dialog" aria-modal="true" aria-label="Goal complete">
        <div className="celebrate">
          <span className="label-caps" style={{ color: 'var(--green)', letterSpacing: 3, fontSize: 14 }}>Goal complete!</span>
          <div className="ring"><div><Star size={80} color="#FFC23D" /></div></div>
          <h1>{e.label}</h1>
          <p className="soft">A new, harder goal has been unlocked. Keep climbing.</p>
          <div className="grow" />
          <button className="btn btn-gold btn-block" onClick={() => pop()} autoFocus>Claim it</button>
        </div>
      </div>
    );
  }

  const text =
    e.type === 'badge'
      ? badgeRun > 1
        ? `${badgeRun} badges unlocked: ${events.slice(0, badgeRun).map((b) => BADGE_BY_ID[b.id!]?.name ?? b.label).join(', ')}`
        : `Badge unlocked: ${BADGE_BY_ID[e.id!]?.name ?? e.label}`
    : e.type === 'dayCleared' ? `Day cleared! Streak: ${e.value} ${e.value === 1 ? 'day' : 'days'} (+50 XP)`
    : e.type === 'shieldUsed' ? 'A streak shield saved your streak!'
    : e.type === 'tierUp' ? `${e.label} quests just got harder. You're ready.`
    : 'Nice!';

  return (
    <div className="toast" role="status" onClick={() => pop(Math.max(1, badgeRun))}>
      {text}
    </div>
  );
}
