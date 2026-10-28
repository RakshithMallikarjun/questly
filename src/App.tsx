import { useEffect, useState } from 'react';
import { Celebrations } from './components/Celebrations';
import { Icon } from './components/Icon';
import { setLanguage, strings } from './i18n';
import { Onboarding } from './screens/Onboarding';
import { Profile } from './screens/Profile';
import { Progress } from './screens/Progress';
import { Quit } from './screens/Quit';
import { Rewards } from './screens/Rewards';
import { Today } from './screens/Today';
import { Journey } from './screens/Journey';
import { useStore } from './store';
import { initNotifications } from './notify';
import { flush, initSync } from './sync';
import { Tour, pendingTour, startTour, useTour } from './components/Tour';
import { newUnlocks } from './game/content/buddy';
import { setCalm } from './fx';

type Tab = 'today' | 'quit' | 'progress' | 'rewards' | 'profile';
const TABS: Tab[] = ['today', 'quit', 'progress', 'rewards', 'profile'];
/** Screens without their own tab. */
type Page = Tab | 'journey';

const tabFromHash = (): Page => {
  const h = window.location.hash.replace('#/', '') as Page;
  return TABS.includes(h as Tab) || h === 'journey' ? h : 'today';
};

export default function App() {
  const onboarded = useStore((s) => s.game.onboarded);
  const language = useStore((s) => s.game.profile.language);
  const tick = useStore((s) => s.tick);
  const [tab, setTab] = useState<Page>(tabFromHash);
  const game = useStore((s) => s.game);
  const busy = useStore((s) => s.events.length > 0);
  const touring = useTour((s) => s.id !== null);
  const calm = !!game.profile.calm;
  const tour = pendingTour(game);
  const unlocks = newUnlocks(game).length;

  useEffect(() => setCalm(calm), [calm]);

  // Tours first, then announce any newly unlocked companion items.
  useEffect(() => {
    if (!game.onboarded || busy || touring) return;
    if (tour) {
      const id = setTimeout(() => startTour(tour), 700);
      return () => clearTimeout(id);
    }
    if (unlocks) useStore.getState().announceUnlocks();
  }, [game.onboarded, busy, touring, tour, unlocks]);
  setLanguage(language);
  const t = strings();

  useEffect(() => {
    initSync();
    initNotifications();
    tick();
    const onVisible = () => (document.visibilityState === 'visible' ? tick() : flush());
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(tick, 60_000);
    const onHash = () => {
      setTab(tabFromHash());
      document.querySelector('.screen')?.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('hashchange', onHash);
      clearInterval(id);
    };
  }, [tick]);

  const go = (next: Tab) => {
    window.location.hash = `/${next}`;
    setTab(next);
    document.querySelector('.screen')?.scrollTo(0, 0);
  };

  if (!onboarded) {
    return (
      <div className="app">
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="app">
      {tab === 'today' && <Today />}
      {tab === 'quit' && <Quit />}
      {tab === 'progress' && <Progress />}
      {tab === 'rewards' && <Rewards />}
      {tab === 'profile' && <Profile />}
      {tab === 'journey' && <Journey />}
      <nav className="nav" aria-label="Main">
        {TABS.map((k) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)} aria-current={tab === k ? 'page' : undefined}>
            <Icon name={k} />
            {t.tabs[k]}
          </button>
        ))}
      </nav>
      <Celebrations />
      <Tour />
    </div>
  );
}
