import { useEffect, useRef, useState } from 'react';
import { AREAS, AREA_BY_ID } from '../game/content/areas';
import type { AreaId, Difficulty, Energy, GameState, Profile as P, ThemeChoice, Tier } from '../game/types';
import { Avatar } from '../components/HeroHeader';
import { Icon } from '../components/Icon';
import { ReminderSettings } from '../components/ReminderSettings';
import { SwitchRow } from '../components/Switch';
import { HealthSetup } from '../components/HealthSetup';
import { BuddyPage } from '../components/BuddyPage';
import { TabTip, startTour } from '../components/Tour';
import { perWord } from '../components/LimitFields';
import { AddHabitSheet } from './Quit';
import { strings } from '../i18n';
import { useStore } from '../store';
import { signIn, signOut, syncConfigured, useSync } from '../sync';

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

type Page = 'buddy' | 'reminders' | 'health' | 'quests' | 'areas' | 'habits' | 'custom' | 'data';

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};
const reminderSummary = (r: P['reminders']) => {
  const parts = [r.morning && clock(r.morning), r.evening && clock(r.evening)].filter(Boolean) as string[];
  if (r.perQuest !== false) parts.push('before each quest');
  return parts.length ? parts.join(' · ') : 'Off';
};

const healthSub = (g: GameState) => {
  if (!g.profile.healthKey) return 'Auto-complete steps, sleep and workout quests';
  const last = Object.keys(g.health).sort().at(-1);
  return last ? `Last data ${new Date(`${last}T12:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'Waiting for the first sync';
};

export function Profile() {
  const g = useStore((s) => s.game);
  const st = useStore.getState();
  const sync = useSync();
  const t = strings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [addingHabit, setAddingHabit] = useState(false);
  const [quest, setQuest] = useState({ title: '', area: (g.profile.areas[0] ?? 'fitness') as AreaId, tier: 1 as Tier, everyDay: true });
  const [addingQuest, setAddingQuest] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  useEffect(() => {
    const open = sessionStorage.getItem('questly-open');
    if (open === 'buddy' || open === 'health') {
      sessionStorage.removeItem('questly-open');
      setPage(open);
    }
  }, []);
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

  const pages: { id: Page; icon: string; color: string; label: string; sub: string }[] = [
    { id: 'buddy', icon: 'paw', color: 'var(--gold)', label: 'My companion', sub: 'Pick your creature and dress it up' },
    { id: 'reminders', icon: 'clock', color: 'var(--purple)', label: t.remind.section, sub: reminderSummary(p.reminders) },
    { id: 'health', icon: 'heart', color: 'var(--pink)', label: 'Apple Health', sub: healthSub(g) },
    { id: 'quests', icon: 'today', color: 'var(--gold)', label: 'Quest settings', sub: `${p.difficulty[0].toUpperCase()}${p.difficulty.slice(1)} · ${p.minutes} min a day` },
    { id: 'areas', icon: 'progress', color: 'var(--green)', label: t.profile.areas, sub: p.areas.map((a) => AREA_BY_ID[a].label).join(', ') },
    { id: 'habits', icon: 'quit', color: 'var(--pink)', label: t.profile.habits, sub: g.habits.length ? g.habits.map((h) => h.name).join(', ') : 'None yet' },
    { id: 'custom', icon: 'plus', color: 'var(--blue)', label: t.profile.customQuests, sub: g.customQuests.length ? `${g.customQuests.length} quest${g.customQuests.length === 1 ? '' : 's'}` : 'Add your own' },
    { id: 'data', icon: 'download', color: 'var(--orange)', label: 'Backup and more', sub: 'Backup, language, start over' },
  ];

  if (page) {
    const meta = pages.find((x) => x.id === page)!;
    return (
      <div className="screen">
        <div className="row">
          <button className="icon-btn" aria-label="Back" onClick={() => setPage(null)}><Icon name="back" /></button>
          <h1 style={{ fontSize: 24 }}>{meta.label}</h1>
        </div>

        {page === 'buddy' && <BuddyPage />}

        {page === 'reminders' && <ReminderSettings />}

        {page === 'health' && <HealthSetup />}

        {page === 'quests' && (
          <div className="card stack">
            <span className="muted small">{t.profile.difficulty}</span>
            <Segmented<Difficulty> value={p.difficulty} onPick={(v) => setP({ difficulty: v })} options={[{ value: 'gentle', label: 'Gentle' }, { value: 'balanced', label: 'Balanced' }, { value: 'hardcore', label: 'Hardcore' }]} />
            <span className="muted small">{t.profile.time}</span>
            <Segmented<number> value={p.minutes} onPick={(v) => setP({ minutes: v as P['minutes'] })} options={[{ value: 10, label: '10' }, { value: 20, label: '20' }, { value: 40, label: '40' }, { value: 60, label: '60+' }]} />
            <span className="muted small">{t.profile.energy}</span>
            <Segmented<Energy> value={p.energy} onPick={(v) => setP({ energy: v })} options={[{ value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Midday' }, { value: 'evening', label: 'Evening' }]} />
            <div className="divider" />
            <div className="set-row">
              <span className="grow">{t.profile.resetHour}</span>
              <select style={{ width: 'auto', height: 40, borderRadius: 12, fontSize: 15 }} value={p.resetHour} onChange={(e) => setP({ resetHour: Number(e.target.value) })}>
                {[0, 1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h === 0 ? 'Midnight' : `${h} am`}</option>)}
              </select>
            </div>
            <span className="muted small">Colours</span>
            <Segmented<ThemeChoice> value={p.theme ?? 'auto'} onPick={(v) => setP({ theme: v })} options={[{ value: 'auto', label: 'Auto' }, { value: 'ocean', label: 'Ocean' }, { value: 'daylight', label: 'Daylight' }, { value: 'classic', label: 'Classic' }]} />
            <span className="muted tiny">Auto uses Daylight when your phone is in light mode and Ocean when it's dark.</span>
            <div className="divider" />
            <SwitchRow label={t.profile.sound} on={p.sound} onChange={(v) => setP({ sound: v })} />
            <SwitchRow label="Vibration (Android)" on={p.vibrate !== false} onChange={(v) => setP({ vibrate: v })} />
            <SwitchRow label="Calm mode (less motion)" on={!!p.calm} onChange={(v) => setP({ calm: v })} />
            <div className="divider" />
            <button className="btn btn-ghost btn-sm" onClick={() => st.rebuild()}>{t.profile.rebuild}</button>
            <span className="muted tiny">Use this after changing areas or time, to get a new set of quests for today.</span>
          </div>
        )}

        {page === 'areas' && (
          <div className="card stack">
            <span className="muted tiny">At least 3. Tap to add or remove.</span>
            <div className="options">
              {AREAS.map((a) => {
                const on = p.areas.includes(a.id);
                return (
                  <button key={a.id} className={`option ${on ? 'on' : ''}`} style={{ borderColor: on ? a.color : undefined, minHeight: 48, fontSize: 14 }} onClick={() => toggleArea(a.id)} aria-pressed={on}>
                    <span className="swatch" style={{ background: a.color, width: 24, height: 24, fontSize: 11 }}>{on ? <Icon name="check" size={16} stroke={3} /> : a.short}</span>
                    <span className="grow">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {page === 'habits' && (
          <div className="card stack" style={{ gap: 4 }}>
            {g.habits.map((h, i) => (
              <div key={h.id}>
                {i > 0 && <div className="divider" />}
                <div className="set-row">
                  <div className="grow">
                    <span>{h.name}</span>
                    <span className="muted tiny">{h.mode === 'limit' ? `Cut down: at most ${h.limit} ${h.unit} ${perWord(h.period)}` : 'Quit completely'}</span>
                  </div>
                  <button className="icon-btn" style={{ background: 'none' }} aria-label={`Stop tracking ${h.name}`} onClick={() => confirm(`Stop tracking ${h.name}?`) && st.removeHabit(h.id)}><Icon name="trash" size={20} color="var(--muted)" /></button>
                </div>
              </div>
            ))}
            {g.habits.length === 0 && <span className="muted small">{t.quit.none}</span>}
            <span className="muted tiny" style={{ marginTop: 6 }}>Change a limit from the Quit tab.</span>
            <button className="btn btn-dashed btn-sm" style={{ marginTop: 6 }} onClick={() => setAddingHabit(true)}>+ Add a habit</button>
          </div>
        )}

        {page === 'custom' && (
          <div className="card stack" style={{ gap: 4 }}>
            {g.customQuests.length === 0 && !addingQuest && <span className="muted small">Add your own recurring quests, like "Practise guitar".</span>}
            {g.customQuests.map((c, i) => (
              <div key={c.id}>
                {i > 0 && <div className="divider" />}
                <div className="set-row">
                  <div className="grow">
                    <span>{c.title}</span>
                    <span className="muted tiny">{AREA_BY_ID[c.area].label} · {c.everyDay ? 'every day' : 'sometimes'}</span>
                  </div>
                  <button className="icon-btn" style={{ background: 'none' }} aria-label={`Remove ${c.title}`} onClick={() => st.removeCustomQuest(c.id)}><Icon name="trash" size={20} color="var(--muted)" /></button>
                </div>
              </div>
            ))}
            {addingQuest ? (
              <div className="stack" style={{ marginTop: 8 }}>
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
              <button className="btn btn-dashed btn-sm" style={{ marginTop: 6 }} onClick={() => setAddingQuest(true)}>+ Add a quest</button>
            )}
          </div>
        )}

        {page === 'data' && (
          <>
            <div className="card stack">
              <span className="muted small">{t.profile.backup}</span>
              <button className="btn btn-ghost btn-sm" onClick={exportBackup}><Icon name="download" size={18} /> {t.profile.export}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> {t.profile.import}</button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
            </div>
            <div className="card stack">
              <div className="set-row">
                <span className="grow">{t.profile.language}</span>
                <select style={{ width: 'auto', height: 40, borderRadius: 12, fontSize: 15 }} value={p.language} onChange={(e) => setP({ language: e.target.value })}>
                  <option value="en">English</option>
                </select>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => startTour('welcome', true)}>Replay the app tour</button>
              <button className="btn btn-ghost btn-sm" onClick={() => confirm('Retake the questionnaire? Your XP, coins and badges stay.') && st.replace({ ...g, onboarded: false })}>{t.profile.retake}</button>
              <button className="btn btn-text btn-sm" style={{ color: 'var(--pink)' }} onClick={() => confirm(t.profile.resetConfirm) && st.reset()}>{t.profile.reset}</button>
            </div>
          </>
        )}

        {addingHabit && <AddHabitSheet onClose={() => setAddingHabit(false)} />}
      </div>
    );
  }

  return (
    <div className="screen">
      <TabTip tab="profile" />
      <div className="card row" style={{ gap: 14 }}>
        <button className="buddy-tile" onClick={() => setPage('buddy')} aria-label="My companion"><Avatar size={64} /></button>
        <div className="grow" style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22 }}>{p.name}</h1>
          {!syncConfigured ? (
            <span className="muted tiny">{t.profile.notConfigured}</span>
          ) : sync.user ? (
            <span className="tiny" style={{ color: sync.status === 'error' ? 'var(--pink)' : 'var(--green)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sync.status === 'error' ? `Sync problem: ${sync.error}` : `${sync.status === 'syncing' ? 'Syncing' : 'Synced'} · ${sync.user.email ?? ''}`}
            </span>
          ) : (
            <span className="muted tiny">Saved on this phone only</span>
          )}
        </div>
      </div>
      {syncConfigured && !sync.user && (
        <button className="btn btn-gold" onClick={() => signIn()}>{t.profile.signIn}</button>
      )}

      {!isStandalone() && (
        <div className="card row" style={{ gap: 12, border: '2px dashed var(--line-2)', background: 'transparent' }}>
          <Icon name="download" color="var(--gold)" />
          <span className="soft small grow">{isIOS() ? t.profile.installIOS : t.profile.installAndroid}</span>
        </div>
      )}

      <nav className="menu" aria-label="Profile settings">
        {pages.map((x) => (
          <button key={x.id} onClick={() => { setPage(x.id); document.querySelector('.screen')?.scrollTo(0, 0); }}>
            <span className="ico" style={{ background: `color-mix(in srgb, ${x.color} 22%, transparent)` }}><Icon name={x.icon} size={20} color={x.color} /></span>
            <span className="grow" style={{ minWidth: 0 }}>
              {x.label}
              <span className="sub">{x.sub}</span>
            </span>
            <Icon name="back" size={18} color="var(--muted)" style={{ transform: 'rotate(180deg)' }} />
          </button>
        ))}
      </nav>

      {sync.user && <button className="btn btn-text btn-sm" onClick={() => signOut()}>{t.profile.signOut}</button>}

      {addingHabit && <AddHabitSheet onClose={() => setAddingHabit(false)} />}
    </div>
  );
}
