import { TabTip } from '../components/Tour';
import { useState } from 'react';
import { BADGES } from '../game/content/badges';
import { REST_DAY_COST, canRestToday, restDayUsedThisWeek } from '../game/engine';
import { Coin, Icon, Star } from '../components/Icon';
import { fmt, strings } from '../i18n';
import { useStore } from '../store';
import { chime } from '../fx';

export function Rewards() {
  const g = useStore((s) => s.game);
  const { buy, rest, addReward, removeReward } = useStore.getState();
  const t = strings();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [cost, setCost] = useState(100);
  const [badge, setBadge] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const day = g.today?.day ?? '';
  const restUsed = day ? restDayUsedThisWeek(g, day) : false;
  const [allBadges, setAllBadges] = useState(false);
  const unlocked = BADGES.filter((b) => g.badges[b.id]).length;
  const shown = badge ? BADGES.find((b) => b.id === badge) : null;

  return (
    <div className="screen">
      <TabTip tab="rewards" />
      <div className="between">
        <h1>{t.rewards.title}</h1>
        <div className="row" style={{ background: '#3A2A12', border: '2px solid var(--gold)', borderRadius: 14, padding: '6px 12px', gap: 6 }}>
          <Coin size={20} />
          <span style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--gold)' }}>{g.coins}</span>
        </div>
      </div>

      <div className="card stack" style={{ border: '2px solid var(--blue)' }}>
        <div className="between">
          <div className="row"><Icon name="moon" color="var(--blue)" /><b>{t.rewards.rest}</b></div>
          <span className="small" style={{ color: 'var(--gold)' }}>{REST_DAY_COST} coins</span>
        </div>
        <p className="muted small">{t.rewards.restBody}</p>
        {g.today?.rest ? (
          <span style={{ color: 'var(--blue)' }}>Today is your rest day.</span>
        ) : restUsed ? (
          <span className="muted small">{t.rewards.restUsed}</span>
        ) : (
          <button className="btn btn-ghost btn-sm" disabled={!canRestToday(g)} onClick={() => { rest(); chime(g.profile.sound, [440, 330]); }}>
            {g.coins < REST_DAY_COST ? fmt(t.rewards.toGo, { n: REST_DAY_COST - g.coins }) : g.today?.cleared ? 'Day already cleared' : 'Take today off'}
          </button>
        )}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <div className="between">
          <h2>Your rewards</h2>
          <button className="btn btn-text btn-sm" onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</button>
        </div>
        {g.rewards.slice().sort((a, b) => a.cost - b.cost).map((r) => {
          const ok = g.coins >= r.cost;
          return (
            <div key={r.id} className="list-item">
              <div className="grow">
                <div>{r.name}</div>
                <div className="small" style={{ color: 'var(--gold)' }}>{r.cost} coins</div>
              </div>
              {editing ? (
                <button className="icon-btn" aria-label={`Remove ${r.name}`} onClick={() => removeReward(r.id)}><Icon name="trash" size={20} /></button>
              ) : ok ? (
                <button className="btn btn-gold btn-sm" style={{ fontSize: 15, minWidth: 84 }} onClick={() => { buy(r.id); chime(g.profile.sound, [523, 659, 784, 1046]); }}>{t.rewards.redeem}</button>
              ) : (
                <span className="muted small" style={{ minWidth: 84, textAlign: 'right' }}>{fmt(t.rewards.toGo, { n: r.cost - g.coins })}</span>
              )}
            </div>
          );
        })}
        {adding ? (
          <div className="card stack">
            <label className="field">{t.rewards.name}<input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. New sneakers" autoFocus /></label>
            <label className="field">{t.rewards.cost}<input type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value) || 1)} /></label>
            <span className="muted tiny">A full day of quests earns about 30 coins.</span>
            <div className="row">
              <button className="btn btn-text grow" onClick={() => setAdding(false)}>{t.common.cancel}</button>
              <button className="btn btn-gold grow" disabled={!name.trim()} onClick={() => { addReward(name.trim(), cost); setName(''); setAdding(false); }}>{t.common.add}</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-dashed" onClick={() => setAdding(true)}>{t.rewards.add}</button>
        )}
      </div>

      <div className="between">
        <h2>{t.rewards.badges}</h2>
        <span className="muted small">{fmt(t.rewards.unlocked, { n: unlocked, total: BADGES.length })}</span>
      </div>
      <div className="badges">
        {(allBadges ? BADGES : [...BADGES.filter((b) => g.badges[b.id]), ...BADGES.filter((b) => !g.badges[b.id])].slice(0, 8)).map((b) => {
          const on = !!g.badges[b.id];
          return (
            <button key={b.id} className="badge" onClick={() => setBadge(b.id)} aria-label={`${b.name}: ${b.desc}${on ? ', unlocked' : ', locked'}`}>
              <span className="medal" style={on ? { borderColor: b.color, background: 'var(--card-2)' } : undefined}>
                <Star size={28} color={on ? b.color : '#3A2F63'} />
              </span>
              <span style={{ color: on ? 'var(--text)' : '#8F86B3' }}>{b.name}</span>
            </button>
          );
        })}
      </div>
      <button className="btn btn-text btn-sm" onClick={() => setAllBadges((v) => !v)}>{allBadges ? 'Show fewer' : `See all ${BADGES.length} badges`}</button>

      {g.purchases.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <h2>{t.rewards.history}</h2>
          {g.purchases.slice(-5).reverse().map((p) => (
            <div key={p.at} className="between small"><span>{p.name}</span><span className="muted">{new Date(p.at).toLocaleDateString()}</span></div>
          ))}
        </div>
      )}

      {shown && (
        <div className="overlay center" onClick={() => setBadge(null)}>
          <div className="sheet" style={{ borderRadius: 28, margin: 16, alignItems: 'center', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <span className="medal" style={{ width: 96, height: 96, borderRadius: 30, border: `4px solid ${g.badges[shown.id] ? shown.color : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={48} color={g.badges[shown.id] ? shown.color : '#3A2F63'} />
            </span>
            <h2>{shown.name}</h2>
            <p className="soft">{shown.desc}</p>
            <p className="muted small">{g.badges[shown.id] ? `Unlocked ${new Date(g.badges[shown.id]).toLocaleDateString()}` : 'Not unlocked yet'}</p>
            <button className="btn btn-ghost btn-block" onClick={() => setBadge(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
