import { ITEMS, SPECIES, STAGE_NAMES, EVOLVE_LEVELS, outfitFor, speciesFor, stageForLevel } from '../game/content/buddy';
import type { Slot } from '../game/content/buddy';
import { levelFor } from '../game/xp';
import { useStore } from '../store';
import { buzz } from '../fx';
import { Avatar } from './HeroHeader';
import { Buddy } from './Buddy';
import { Icon } from './Icon';

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'head', label: 'Hats' },
  { slot: 'face', label: 'Face' },
  { slot: 'neck', label: 'Neck' },
  { slot: 'color', label: 'Colours' },
];

/** Profile page: pick your creature and dress it up with unlocked items. */
export function BuddyPage() {
  const g = useStore((s) => s.game);
  const updateProfile = useStore((s) => s.updateProfile);
  const species = speciesFor(g.profile.avatar);
  const level = levelFor(g.xp).level;
  const stage = stageForLevel(level);
  const outfit = outfitFor(g);
  const nextEvolve = EVOLVE_LEVELS.find((l) => l > level);

  const wear = (slot: Slot, id: string) => {
    const worn = { ...g.profile.buddy };
    if (worn[slot] === id) delete worn[slot];
    else worn[slot] = id;
    updateProfile({ buddy: worn });
    buzz(g.profile.vibrate, 12);
  };

  return (
    <>
      <div className="card stack" style={{ alignItems: 'center', gap: 6 }}>
        <Avatar size={150} />
        <b style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600 }}>{STAGE_NAMES[stage]} {SPECIES.find((x) => x.id === species)?.label.toLowerCase()}</b>
        <span className="muted small center">
          {nextEvolve ? `Grows up at level ${nextEvolve}. You are level ${level}.` : 'Fully grown. Legendary!'}
        </span>
      </div>

      <div className="card stack">
        <span className="muted small">Your creature</span>
        <div className="buddy-grid">
          {SPECIES.map((s) => (
            <button key={s.id} className={`option ${species === s.id ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 6, gap: 2, borderColor: species === s.id ? 'var(--gold)' : undefined }} onClick={() => updateProfile({ avatar: s.id })} aria-pressed={species === s.id}>
              <Buddy species={s.id} stage={stage} outfit={outfit} size={56} still />
              <span className="tiny">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {SLOTS.map(({ slot, label }) => (
        <div key={slot} className="card stack">
          <span className="muted small">{label}</span>
          <div className="buddy-grid">
            {slot === 'color' && (
              <button className={`option ${!outfit.color ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 6, gap: 2, borderColor: !outfit.color ? 'var(--gold)' : undefined }} onClick={() => outfit.color && wear('color', outfit.color)}>
                <Buddy species={species} stage={stage} outfit={{ ...outfit, color: undefined }} size={56} still />
                <span className="tiny">Classic</span>
              </button>
            )}
            {ITEMS.filter((i) => i.slot === slot).map((i) => {
              const open = i.unlocked(g);
              const on = outfit[slot] === i.id;
              return (
                <button
                  key={i.id}
                  className={`option ${on ? 'on' : ''} ${open ? '' : 'locked'}`}
                  style={{ flexDirection: 'column', padding: 6, gap: 2, borderColor: on ? 'var(--gold)' : undefined, position: 'relative' }}
                  disabled={!open}
                  onClick={() => wear(slot, i.id)}
                  aria-pressed={on}
                  aria-label={open ? i.name : `${i.name}, locked. ${i.how}`}
                >
                  <Buddy species={species} stage={stage} outfit={{ ...outfit, [slot]: i.id }} size={56} still />
                  <span className="tiny" style={{ lineHeight: 1.15 }}>{open ? i.name : i.how}</span>
                  {!open && <span className="lock"><Icon name="lock" size={14} color="#fff" stroke={2.6} /></span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
