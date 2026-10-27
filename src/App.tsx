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
import { useStore } from './store';
import { initNotifications } from './notify';
import { flush, initSync } from './sync';

type Tab = 'today' | 'quit' | 'progress' | 'rewards' | 'profile';
const TABS: Tab[] = ['today', 'quit', 'progress', 'rewards', 'profile'];

const tabFromHash = (): Tab => {
  const h = window.location.hash.replace('#/', '') as Tab;
  return TABS.includes(h) ? h : 'today';
};

export default function App() {
  const onboarded = useStore((s) => s.game.onboarded);
  const language = useStore((s) => s.game.profile.language);
  const tick = useStore((s) => s.tick);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  setLanguage(language);
  const t = strings();

  useEffect(() => {
    initSync();
    initNotifications();
    tick();
    const onVisible = () => (document.visibilityState === 'visible' ? tick() : flush());
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(tick, 60_000);
    const onHash = () => setTab(tabFromHash());
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
      <nav className="nav" aria-label="Main">
        {TABS.map((k) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)} aria-current={tab === k ? 'page' : undefined}>
            <Icon name={k} />
            {t.tabs[k]}
          </button>
        ))}
      </nav>
      <Celebrations />
    </div>
  );
}
