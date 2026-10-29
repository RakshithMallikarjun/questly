import { useState } from 'react';
import { deleteCloudCopy, syncConfigured, useSync } from '../sync';

const UPDATED = '29 October 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card stack" style={{ gap: 8 }}>
      <h2 style={{ fontSize: 17 }}>{title}</h2>
      {children}
    </section>
  );
}

/** Plain-words privacy page: what Questly keeps, where, and how to delete it. */
export function PrivacyPage({ openHealth, openData }: { openHealth: () => void; openData: () => void }) {
  const sync = useSync();
  const [status, setStatus] = useState('');

  const removeCloud = async () => {
    if (!confirm('Delete your synced copy from the cloud? You will be signed out. Your progress on this phone stays.')) return;
    setStatus('Deleting…');
    try {
      await deleteCloudCopy();
      setStatus('Done. Your synced copy is deleted and you are signed out.');
    } catch (e) {
      setStatus(`Could not delete it: ${(e as Error).message}. Check your connection and try again.`);
    }
  };

  return (
    <>
      <p className="soft small">
        Questly is a free app shared with friends and family. It has no ads and no tracking, and your data is never sold or shared for marketing.
      </p>

      <Section title="On this phone">
        <p className="soft small">
          Your name, quests, XP, habits you're building or quitting, slips, rewards and any Apple Health numbers are saved in this browser on your phone. Nobody else can see them.
        </p>
        <p className="soft small">
          To delete them, use <b>Start over</b>.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={openData}>Open Backup and more</button>
      </Section>

      <Section title="If you sign in to sync">
        <p className="soft small">
          A copy of all your progress, linked to your Google account's name and email, is kept in Google Firebase so your other phones get it. Your reminder times and your phone's notification address are kept there too, so reminders can arrive while the app is closed. A scheduled job run on GitHub reads them to send reminders.
        </p>
        {syncConfigured && sync.user ? (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--pink)' }} onClick={() => void removeCloud()}>Delete my synced copy</button>
        ) : (
          <p className="muted tiny">You're not signed in, so nothing is synced.</p>
        )}
        {status && <p className="small" role="status">{status}</p>}
      </Section>

      <Section title="Apple Health (iPhone)">
        <p className="soft small">
          If you connect it, the Questly Health shortcut sends your daily steps, sleep, workout and mindful minutes for the last 7 days to Google Firebase, even if you're not signed in. They're stored under a long random key that only your phone knows, and Questly uses them only to tick off matching quests.
        </p>
        <p className="soft small">
          To stop, tap <b>Disconnect</b> on the Apple Health page and delete the automation in the Shortcuts app.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={openHealth}>Open Apple Health</button>
      </Section>

      <Section title="Other services">
        <p className="soft small">
          The app is hosted on GitHub Pages and its fonts come from Google Fonts. Like any website, they see basic connection details such as your IP address. Google's and GitHub's servers may be outside India.
        </p>
      </Section>

      <Section title="Questions">
        <p className="soft small">
          Ask the person who shared Questly with you. If you want your data deleted and can't do it yourself, they can help.
        </p>
      </Section>

      <p className="muted tiny">Last updated {UPDATED}.</p>
    </>
  );
}
