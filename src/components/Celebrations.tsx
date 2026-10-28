import { Modal } from './Modal';
import { useEffect, useState } from 'react';
import { isRequired } from '../game/generator';
import { BADGE_BY_ID } from '../game/content/badges';
import { levelFor, titleFor } from '../game/xp';
import { useStore } from '../store';
import { stagesFor } from '../game/content/journeys';
import { burst, buzz, chime, focusQuest } from '../fx';
import { Star } from './Icon';
import { Avatar } from './HeroHeader';
import { EVOLVE_LEVELS, ITEM_BY_ID, SPECIES, speciesFor, stageForLevel, STAGE_NAMES } from '../game/content/buddy';
import { Buddy } from './Buddy';

/** Shows level-ups, badges and other wins, one at a time. */
export function Celebrations() {
  const events = useStore((s) => s.events);
  const pop = useStore((s) => s.popEvent);
  const g = useStore((s) => s.game);
  const e = events[0];
  const big = e && (e.type === 'levelUp' || e.type === 'unlock' || e.type === 'goal' || e.type === 'journeyMilestone' || e.type === 'journeyDone');
  // Several badges at once are shown together in one message.
  let badgeRun = 0;
  while (events[badgeRun]?.type === 'badge') badgeRun += 1;

  // Confetti is saved for the big moments: level-up, day cleared (and the chest).
  useEffect(() => {
    if (!e) return;
    const sound = g.profile.sound;
    const vibrate = g.profile.vibrate;
    if (e.type === 'levelUp') burst(true);
    if (e.type === 'dayCleared') burst();
    if (big) {
      chime(sound, [523, 659, 784, 1046]);
      buzz(vibrate, [40, 60, 40, 60, 120]);
    } else if (e.type === 'dayCleared' || e.type === 'badge' || e.type === 'journeyDay' || e.type === 'lifeRestored') {
      chime(sound, [659, 784, 988]);
      buzz(vibrate, [30, 40, 60]);
    }
  }, [e, big, g.profile.sound, g.profile.vibrate]);

  // Small messages close by themselves, but never while you're reading or focused on them.
  // Holding is tied to one message, so the next message closes on its own again.
  const [heldEvent, setHeldEvent] = useState<object | null>(null);
  const hold = !!e && heldEvent === e;
  const setHold = (on: boolean) => setHeldEvent(on ? e : null);
  useEffect(() => {
    if (!e || big || hold) return;
    const id = setTimeout(() => pop(Math.max(1, badgeRun)), e.type === 'badge' || e.type === 'dayCleared' || e.type === 'cleanDay' ? 4500 : 3500);
    return () => clearTimeout(id);
  }, [e, big, hold, pop, badgeRun]);

  if (!e) return null;

  if (e.type === 'levelUp') {
    const lv = e.value ?? levelFor(g.xp).level;
    const next = 5 * Math.ceil(lv / 5) + 1;
    const evolved = EVOLVE_LEVELS.includes(lv);
    const species = speciesFor(g.profile.avatar);
    const label = SPECIES.find((x) => x.id === species)?.label.toLowerCase();
    return (
      <Modal bare label={`Level up to ${lv}`} onClose={() => pop()}><div className="overlay center">
        <div className="celebrate">
          <span className="label-caps" style={{ color: 'var(--green)', letterSpacing: 3, fontSize: 14 }}>{evolved ? 'Evolution!' : 'Level up!'}</span>
          {evolved ? (
            <div className="row evolve" style={{ gap: 4, alignItems: 'flex-end' }}>
              <Buddy species={species} stage={stageForLevel(lv - 1)} mood="happy" size={96} still />
              <span style={{ fontSize: 28, color: 'var(--gold)', paddingBottom: 30 }}>→</span>
              <Avatar size={170} mood="cheer" />
            </div>
          ) : (
            <>
              <div className="ring"><div>
                <span className="muted small">LEVEL</span>
                <span style={{ fontFamily: 'var(--display)', fontSize: 76, lineHeight: 1, color: 'var(--gold)' }}>{lv}</span>
              </div></div>
              <div style={{ marginTop: -54 }}><Avatar size={96} mood="cheer" /></div>
            </>
          )}
          <h1>{evolved ? `Your ${label} grew up!` : `You're getting stronger, ${g.profile.name}`}</h1>
          <p className="soft">
            {evolved ? `Level ${lv}: your ${label} is now ${STAGE_NAMES[stageForLevel(lv)].toLowerCase()}. ` : ''}
            {g.streak.current > 1 ? `${g.streak.current} days in a row. ` : ''}
            {lv % 5 === 1 && lv > 1 ? `New title: ${titleFor(lv)}!` : `${next - lv} more ${next - lv === 1 ? 'level' : 'levels'} until you reach the rank of ${titleFor(next)}.`}
          </p>
          <div className="grow" />
          <button className="btn btn-gold btn-block" onClick={() => pop()} autoFocus data-autofocus>Keep going</button>
        </div>
      </div></Modal>
    );
  }

  if (e.type === 'unlock') {
    const many = (e.value ?? 1) > 1;
    const item = e.id ? ITEM_BY_ID[e.id] : undefined;
    const preview = item ? { [item.slot]: item.id } : {};
    return (
      <Modal bare label="New item unlocked" onClose={() => pop()}><div className="overlay center">
        <div className="celebrate">
          <span className="label-caps" style={{ color: 'var(--green)', letterSpacing: 3, fontSize: 14 }}>{many ? 'New items unlocked!' : 'New item unlocked!'}</span>
          <Buddy species={speciesFor(g.profile.avatar)} stage={stageForLevel(levelFor(g.xp).level)} mood="cheer" outfit={preview} size={200} />
          <h1>{e.label}</h1>
          <p className="soft">Dress up your companion in Profile, My companion.</p>
          <div className="grow" />
          <button className="btn btn-gold btn-block" onClick={() => { pop(); window.location.hash = '/profile'; sessionStorage.setItem('questly-open', 'buddy'); }}>Try it on</button>
          <button className="btn btn-text" onClick={() => pop()}>Later</button>
        </div>
      </div></Modal>
    );
  }

  if (e.type === 'goal') {
    return (
      <Modal bare label="Goal complete" onClose={() => pop()}><div className="overlay center">
        <div className="celebrate">
          <span className="label-caps" style={{ color: 'var(--green)', letterSpacing: 3, fontSize: 14 }}>Goal complete!</span>
          <div className="ring"><div><Star size={80} color="#FFC23D" /></div></div>
          <h1>{e.label}</h1>
          <p className="soft">A new, harder goal has been unlocked. Keep climbing.</p>
          <div className="grow" />
          <button className="btn btn-gold btn-block" onClick={() => pop()} autoFocus data-autofocus>Claim it</button>
        </div>
      </div></Modal>
    );
  }

  if (e.type === 'journeyMilestone' || e.type === 'journeyDone') {
    const j = g.journey;
    const stage = j ? stagesFor(j.length).find((s) => s.to === e.value) : undefined;
    const done = e.type === 'journeyDone';
    return (
      <Modal bare label={done ? 'Journey complete' : 'Milestone reached'} onClose={() => pop()}><div className="overlay center">
        <div className="celebrate">
          <span className="label-caps" style={{ color: 'var(--green)', letterSpacing: 3, fontSize: 14 }}>{done ? 'Journey complete!' : `Day ${e.value} reached!`}</span>
          <div className="ring"><div><span style={{ fontSize: 84, lineHeight: 1 }}>{done ? '🏆' : '🏅'}</span></div></div>
          <h1>{done ? `Habit formed: ${e.label}` : `${e.label} conquered`}</h1>
          <p className="soft">
            {done
              ? `${e.value} days of showing up. These habits are part of who you are now.`
              : 'Milestone reward unlocked.'}
            {stage ? ` +${stage.xp} XP, +${stage.coins} coins${!done && j?.undo?.life ? ', and a heart back' : ''}.` : ''}
          </p>
          <div className="grow" />
          <button className="btn btn-gold btn-block" onClick={() => pop()} autoFocus data-autofocus>{done ? 'Claim my trophy' : 'Onward!'}</button>
        </div>
      </div></Modal>
    );
  }

  const text =
    e.type === 'journeyDay' ? `Journey step ${e.value} done! ${(g.journey?.length ?? 66) - (e.value ?? 0)} to go.`
    : e.type === 'lifeLost' ? (g.journey?.comeback ? 'Out of hearts. A comeback quest is waiting for you today.' : `You missed a journey day and lost ${e.label === '1' ? 'a heart' : `${e.label} hearts`}. ${e.value} left.`)
    : e.type === 'lifeRestored' ? 'Comeback complete! You won back a heart. ❤️'
    : e.type === 'badge'
      ? badgeRun > 1
        ? `${badgeRun} badges unlocked: ${events.slice(0, badgeRun).map((b) => BADGE_BY_ID[b.id!]?.name ?? b.label).join(', ')}`
        : `Badge unlocked: ${BADGE_BY_ID[e.id!]?.name ?? e.label}`
    : e.type === 'dayCleared' ? dayClearedText(e.value ?? 0, g.today?.queue.filter(isRequired).length ?? 0)
    : e.type === 'cleanDay' ? `🌱 ${e.value} clean ${e.value === 1 ? 'day' : 'days'}: ${e.label}. Well done.`
    : e.type === 'shieldUsed' ? 'A streak shield saved your streak!'
    : e.type === 'tierUp' ? `${e.label} quests just got harder. You're ready.`
    : 'Nice!';

  return (
    <div className="toast-wrap" role="status">
      <button
        className="toast"
        onClick={() => { setHold(false); pop(Math.max(1, badgeRun)); focusQuest(); }}
        onMouseEnter={() => setHold(true)}
        onMouseLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={() => setHold(false)}
        aria-label={`${text} Tap to close.`}
      >
        {text}
      </button>
    </div>
  );
}

const dayClearedText = (streak: number, left: number) => {
  const days = `${streak}-day streak`;
  return left > 0
    ? `Streak saved: ${days}! ${left} quest${left === 1 ? '' : 's'} left, and your chest is ready.`
    : `Day cleared: ${days}! Your mystery chest is ready.`;
};
