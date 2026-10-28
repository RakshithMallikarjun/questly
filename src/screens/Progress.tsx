import { TabTip } from '../components/Tour';
import { AREA_BY_ID } from '../game/content/areas';
import { daysBetween, toKey } from '../game/date';
import { goalTarget } from '../game/engine';
import { Radar } from '../components/Radar';
import { fmt, strings } from '../i18n';
import { useStore } from '../store';
import { JourneyCard } from './Journey';

const SHADES = ['var(--line)', '#1E5E4A', '#2BA577', '#3DDC97'];

export function Progress() {
  const g = useStore((s) => s.game);
  const t = strings();
  const day = g.today?.day ?? toKey(new Date());

  // Calendar for the current month, Monday first.
  const [y, m] = day.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: lead + daysInMonth }, (_, i) => {
    if (i < lead) return null;
    const d = i - lead + 1;
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const h = g.history[key];
    let level = 0;
    if (h && h.offered) level = h.cleared ? 3 : h.done / h.offered >= 0.3 ? 2 : h.done > 0 ? 1 : 0;
    return { d, key, level, rest: h?.rest };
  });
  const clearedThisMonth = cells.filter((c) => c && c.level === 3).length;
  const monthName = first.toLocaleDateString([], { month: 'long' });

  const activeGoals = g.goals.filter((x) => !x.completedAt && g.profile.areas.includes(x.area));
  const lastHealth = Object.keys(g.health).sort().at(-1);

  return (
    <div className="screen">
      <TabTip tab="progress" />
      <h1>{t.progress.title}</h1>
      <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '12px 4px 6px' }}>
        <Radar stats={g.stats} />
      </div>

      <JourneyCard />

      <div className="stack">
        <h2>{t.progress.goals}</h2>
        {activeGoals.map((goal) => {
          const def = goalTarget(goal.area, goal.level);
          const area = AREA_BY_ID[goal.area];
          const dayN = Math.min(30, daysBetween(goal.start, day) + 1);
          return (
            <div key={goal.area + goal.start} className="card stack" style={{ padding: '12px 14px', gap: 8 }}>
              <div className="between">
                <span style={{ fontSize: 15 }}>{def.title}</span>
                <span className="small" style={{ color: area.color, whiteSpace: 'nowrap' }}>{fmt(t.progress.day, { n: dayN })}</span>
              </div>
              <div className="bar" style={{ height: 10, background: 'var(--bg)' }}>
                <span style={{ width: `${Math.min(100, Math.round((goal.progress / def.target) * 100))}%`, background: area.color }} />
              </div>
              <span className="muted tiny">{area.label} · {fmt(t.progress.quests, { n: goal.progress, target: def.target })}</span>
            </div>
          );
        })}
      </div>

      <div className="stack">
        <div className="between">
          <h2>{monthName}</h2>
          <span className="muted small">{fmt(t.progress.cleared, { n: clearedThisMonth })}</span>
        </div>
        <div className="heat" role="img" aria-label={`${clearedThisMonth} days cleared in ${monthName}`}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={`h${i}`} style={{ background: 'none', color: 'var(--muted)', aspectRatio: 'auto' }}>{d}</span>)}
          {cells.map((c, i) => c
            ? <span key={c.key} style={{ background: c.rest ? 'var(--blue)' : SHADES[c.level], outline: c.key === day ? '2px solid var(--gold)' : undefined }}>{c.d}</span>
            : <span key={`e${i}`} style={{ background: 'none' }} />)}
        </div>
      </div>

      <div className="stack">
        <h2>{t.progress.totals}</h2>
        <div className="chips3">
          <div className="chip-stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}><b>{g.totals.quests}</b><span className="muted tiny">quests done</span></div>
          <div className="chip-stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}><b>{g.totals.daysCleared}</b><span className="muted tiny">days cleared</span></div>
          <div className="chip-stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}><b>{g.streak.best}</b><span className="muted tiny">best streak</span></div>
        </div>
      </div>

      {lastHealth && (
        <div className="card stack">
          <h2>{t.progress.health}</h2>
          <span className="muted tiny">{lastHealth}</span>
          <div className="chips3">
            {g.health[lastHealth].steps !== undefined && <div className="chip-stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0, background: 'var(--bg)' }}><b>{g.health[lastHealth].steps!.toLocaleString()}</b><span className="muted tiny">steps</span></div>}
            {g.health[lastHealth].sleepHours !== undefined && <div className="chip-stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0, background: 'var(--bg)' }}><b>{g.health[lastHealth].sleepHours!.toFixed(1)}</b><span className="muted tiny">hours sleep</span></div>}
            {g.health[lastHealth].workoutMinutes !== undefined && <div className="chip-stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0, background: 'var(--bg)' }}><b>{g.health[lastHealth].workoutMinutes}</b><span className="muted tiny">workout min</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}
