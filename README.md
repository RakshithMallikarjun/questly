# Questly

Level up your life, one quest at a time. Questly is a free, personal habit app that turns your goals into daily quests, rewards you with XP, coins, levels and badges, and helps you break bad habits.

**Live app:** https://rakshithmallikarjun.github.io/questly/

## What it does

- **Character creation:** a 12-question setup picks your life areas (at least 3), habits to break, daily time and difficulty.
- **One quest at a time:** Today shows a single quest. Finish it (or tap "Not now") and the next one appears. A main quest, daily quests, habit check-ins and an optional bonus quest are built fresh every day from a library of 130+ quests.
- **Game system:** XP and levels with titles, coins, streaks with streak shields, a streak XP bonus, 30-day goals per area, a weekly challenge, character stats and 32 badges.
- **Quit tab:** clean-day counters, daily limits for cut-down habits, an "I'm tempted" urge breaker, and slip triggers.
- **Rewards shop:** spend coins on rewards you define, or on a once-a-week rest day pass that keeps your streak.
- **Adapts to you:** areas where you finish 80%+ of quests get harder each week; below 40% they get easier.
- **Reminders:** a morning nudge and evening check-in at times you pick, plus a nudge before each quest's finish-by time (editable on every quest), with quiet hours.
- **Works like an app:** add it to your phone's home screen. Works offline.
- **Sync (optional):** Google sign-in syncs progress between phones through your own free Firebase project.

## Install on your phone

- **iPhone:** open the link in Safari, tap Share, then "Add to Home Screen".
- **Android:** open the link in Chrome, tap the menu, then "Install app".

## For developers

```bash
npm install
npm run dev     # local dev server
npm test        # game-rule tests
npm run build   # production build in dist/
```

- `src/game/` holds the game rules (pure functions, tested in `engine.test.ts`) and content (quests, habits, badges, challenges).
- `src/screens/` holds the five tabs and onboarding. `src/i18n/en.ts` holds all interface text, so other languages can be added later.
- Sync settings live in `src/sync/config.ts`; data rules are in `firestore.rules`.
- Every push to `main` is tested and deployed to GitHub Pages by `.github/workflows/deploy.yml`.
- Reminders: `src/game/reminders.ts` plans them; `src/notify.ts` asks for permission and registers the phone; `public/push-sw.js` shows them. While the app is closed, `.github/workflows/reminders.yml` runs `server/send-reminders.mjs` every 10 minutes. It sends through Firebase Cloud Messaging and needs the repository secret `FIREBASE_SERVICE_ACCOUNT` (a Firebase service account key, as JSON), plus the Web Push public key in `vapidPublicKey` (`src/sync/config.ts`). Without them the job does nothing and reminders only show while the app is open.
