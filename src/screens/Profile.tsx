import { useRef, useState } from 'react';
import { AREAS, AREA_BY_ID } from '../game/content/areas';
import type { AreaId, Difficulty, Energy, GameState, Profile as P, Tier } from '../game/types';
import { Avatar } from '../components/HeroHeader';
import { Icon } from '../components/Icon';
import { AddHabitSheet } from './Quit';
import { fmt, strings } from '../i18n';
import { useStore } from '../store';
import { signIn, signOut, syncConfigured, useSync } from '../sync';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="stack">
      <h2>{title}</h2>
      <div className="card stack">{children}</div>
    </div>
  );
}

function Segmented<T extends string | number>({ value, options, onPick }: { value: T; options: { value: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button key={String(o.value)} className={`btn btn-sm grow ${value === o.value ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: 14, fontFamily: 'var(--body)', fontWeight: 800 }} onClick={() => onPick(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function Profile() {
  const g = useStore((s) => s.game);
  const st = useStore.getState();
  const sync = useSync();
  const t = strings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [addingHabit, setAddingHabit] = useState(false);
  const [quest, setQuest] = useState({ title: '', area: (g.profile.areas[0] ?? 'fitness') as AreaId, tier: 1 as Tier, everyDay: true });
  const [addingQuest, setAddingQuest] = useState(false);
  const p = g.profile;
  const setP = (patch: Partial<P>) => st.updateProfile(patch);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(g, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `questly-backup-${g.today?.day ?? 'today'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as GameState;
      if (data.version !== 1 || !data.profile) throw new Error('Not a Questly backup');
      st.replace({ ...data, updatedAt: Date.now() });
      st.tick();
      alert('Backup restored.');
    } catch (e) {
      alert(`Could not restore: ${(e as Error).message}`);
    }
  };

  const toggleArea = (a: AreaId) => {
    const next = p.areas.includes(a) ? p.areas.filter((x) => x !== a) : [...p.areas, a];
    if (next.length < 3) return;
    setP({ areas: next });
  };

  return (
    <div className="screen">
      <div className="row">
        <Avatar id={p.avatar} name={p.name} size={64} />
        <div className="grow">
          <h1 style={{ fontSize: 24 }}>{p.name}</h1>
          <span className="muted small">{t.profile.title}</span>
        </div>
      </div>

      <Section title={t.profile.sync}>
        {!syncConfigured ? (
          <p className="muted small">{t.profile.notConfigured}</p>
        ) : sync.user ? (
          <>
            <p className="small">{fmt(t.profile.signedIn, { email: sync.user.email ?? '' })}</p>
            <span className="tiny" style={{ color: sync.status === 'error' ? 'var(--pink)' : 'var(--green)' }}>
              {sync.status === 'error' ? `Sync problem: ${sync.error}` : sync.status === 'syncing' ? 'Syncing…' : 'Up to date'}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>{t.profile.signOut}</button>
          </>
        ) : (
          <>
            <p className="muted small">{t.profile.localOnly}</p>
            <button className="btn btn-gold" onClick={() => signIn()}>{t.profile.signIn}</button>
            {sync.status === 'error' && <span className="tiny" style={{ color: 'var(--pink)' }}>{sync.error}</span>}
          </>
        )}
      </Section>

      {!isStandalone() && (
        <Section title={t.profile.install}>
          <p className="soft small">{isIOS() ? t.profile.installIOS : t.profile.installAndroid}</p>
        </Section>
      )}

      <Section title={t.profile.settings}>
        <span className="muted small">{t.profile.difficulty}</span>
        <Segmented<Difficulty> value={p.difficulty} onPick={(v) => setP({ difficulty: v })} options={[{ value: 'gentle', label: 'Gentle' }, { value: 'balanced', label: 'Balanced' }, { value: 'hardcore', label: 'Hardcore' }]} />
        <span className="muted small">{t.profile.time}</span>
        <Segmented<number> value={p.minutes} onPick={(v) => setP({ minutes: v as P['minutes'] })} options={[{ value: 10, label: '10 min' }, { value: 20, label: '20' }, { value: 40, label: '40' }, { value: 60, label: '60+' }]} />
        <span className="muted small">{t.profile.energy}</span>
        <Segmented<Energy> value={p.energy} onPick={(v) => setP({ energy: v })} options={[{ value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' }, { value: 'evening', label: 'Evening' }]} />
        <label className="field">{t.profile.resetHour}
          <select value={p.resetHour} onChange={(e) => setP({ resetHour: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h === 0 ? 'Midnight' : `${h} am`}</option>)}
          </select>
        </label>
        <div className="row">
          <label className="field grow">Morning reminder
            <input type="time" value={p.reminders.morning ?? ''} onChange={(e) => setP({ reminders: { ...p.reminders, morning: e.target.value || null } })} />
          </label>
          <label className="field grow">Evening reminder
            <input type="time" value={p.reminders.evening ?? ''} onChange={(e) => setP({ reminders: { ...p.reminders, evening: e.target.value || null } })} />
          </label>
        </div>
        <span className="muted tiny">Phone notifications arrive in the next update.</span>
        <label className="between" style={{ minHeight: 44 }}>
          <span>{t.profile.sound}</span>
          <input type="checkbox" checked={p.sound} onChange={(e) => setP({ sound: e.target.checked })} style={{ width: 24, height: 24, accentColor: '#3DDC97' }} />
        </label>
        <button className="btn btn-ghost btn-sm" onClick={() => st.rebuild()}>{t.profile.rebuild}</button>
        <span className="muted tiny">Use this after changing areas or time, to get a new set of quests for today.</span>
      </Section>

      <Section title={t.profile.areas}>
        <span className="muted tiny">At least 3. Tap to add or remove.</span>
        <div className="options">
          {AREAS.map((a) => {
            const on = p.areas.includes(a.id);
            return (
              <button key={a.id} className={`option ${on ? 'on' : ''}`} style={{ borderColor: on ? a.color : undefined, minHeight: 48 }} onClick={() => toggleArea(a.id)} aria-pressed={on}>
                <span className="swatch" style={{ background: a.color, width: 24, height: 24 }}>{a.short}</span>
                <span className="grow small">{a.label}</span>
                {on && <span className="tiny muted">T{g.tiers[a.id]}</span>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t.profile.habits}>
        {g.habits.map((h) => (
          <div key={h.id} className="between">
            <span>{h.name} <span className="muted tiny">{h.mode === 'limit' ? `max ${h.limit} ${h.unit}` : 'quit'}</span></span>
            <button className="icon-btn" aria-label={`Stop tracking ${h.name}`} onClick={() => confirm(`Stop tracking ${h.name}?`) && st.removeHabit(h.id)}><Icon name="trash" size={20} /></button>
          </div>
        ))}
        <button className="btn btn-dashed btn-sm" onClick={() => setAddingHabit(true)}>+ Add a habit</button>
      </Section>

      <Section title={t.profile.customQuests}>
        {g.customQuests.length === 0 && <span className="muted small">Add your own recurring quests, like "Practise guitar".</span>}
        {g.customQuests.map((c) => (
          <div key={c.id} className="between">
            <span>{c.title} <span className="muted tiny">{AREA_BY_ID[c.area].label} · {c.everyDay ? 'every day' : 'sometimes'}</span></span>
            <button className="icon-btn" aria-label={`Remove ${c.title}`} onClick={() => st.removeCustomQuest(c.id)}><Icon name="trash" size={20} /></button>
          </div>
        ))}
        {addingQuest ? (
          <div className="stack">
            <input type="text" placeholder="Quest name" value={quest.title} maxLength={60} onChange={(e) => setQuest({ ...quest, title: e.target.value })} />
            <select value={quest.area} onChange={(e) => setQuest({ ...quest, area: e.target.value as AreaId })}>
              {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <Segmented<number> value={quest.tier} onPick={(v) => setQuest({ ...quest, tier: v as Tier })} options={[{ value: 1, label: 'Easy' }, { value: 2, label: 'Medium' }, { value: 3, label: 'Hard' }]} />
            <Segmented<string> value={quest.everyDay ? 'y' : 'n'} onPick={(v) => setQuest({ ...quest, everyDay: v === 'y' })} options={[{ value: 'y', label: 'Every day' }, { value: 'n', label: 'Sometimes' }]} />
            <div className="row">
              <button className="btn btn-text grow" onClick={() => setAddingQuest(false)}>Cancel</button>
              <button className="btn btn-gold grow" disabled={!quest.title.trim()} onClick={() => { st.addCustomQuest(quest.area, quest.title.trim(), quest.tier, quest.everyDay); setQuest({ ...quest, title: '' }); setAddingQuest(false); }}>Add</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-dashed btn-sm" onClick={() => setAddingQuest(true)}>+ Add a quest</button>
        )}
      </Section>

      <Section title={t.profile.backup}>
        <button className="btn btn-ghost btn-sm" onClick={exportBackup}><Icon name="download" size={18} /> {t.profile.export}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> {t.profile.import}</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
      </Section>

      <Section title="More">
        <label className="field">{t.profile.language}
          <select value={p.language} onChange={(e) => setP({ language: e.target.value })}>
            <option value="en">English</option>
          </select>
        </label>
        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Retake the questionnaire? Your XP, coins and badges stay.') && st.replace({ ...g, onboarded: false })}>{t.profile.retake}</button>
        <button className="btn btn-text btn-sm" style={{ color: 'var(--pink)' }} onClick={() => confirm(t.profile.resetConfirm) && st.reset()}>{t.profile.reset}</button>
      </Section>

      {addingHabit && <AddHabitSheet onClose={() => setAddingHabit(false)} />}
    </div>
  );
}
