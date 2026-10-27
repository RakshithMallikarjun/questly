import { AVATARS } from '../game/content/areas';
import { levelFor, titleFor } from '../game/xp';
import { strings } from '../i18n';
import { useStore } from '../store';
import { Coin, Flame, Shield } from './Icon';

export function Avatar({ id, name, size = 52 }: { id: string; name: string; size?: number }) {
  const a = AVATARS.find((x) => x.id === id) ?? AVATARS[0];
  return (
    <div className="avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${a.from}, ${a.to})`, fontSize: size * 0.42 }}>
      {(name || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

export function HeroHeader() {
  const g = useStore((s) => s.game);
  const t = strings();
  const lv = levelFor(g.xp);
  return (
    <>
      <div className="hero-row">
        <Avatar id={g.profile.avatar} name={g.profile.name} />
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
      <div className="chips3">
        <div className="chip-stat"><Flame /><div><b>{g.streak.current}</b><span className="muted tiny">{t.common.dayStreak}</span></div></div>
        <div className="chip-stat"><Coin /><div><b>{g.coins}</b><span className="muted tiny">{t.common.coins}</span></div></div>
        <div className="chip-stat"><Shield /><div><b>{g.streak.shields}</b><span className="muted tiny">{t.common.shields}</span></div></div>
      </div>
    </>
  );
}
