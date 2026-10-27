// Sends Questly reminders to phones. Runs every 10 minutes from GitHub Actions.
//
// Each user's document (users/{uid}) holds:
//   plan: [{ at, tag, title, body }]  written by the app whenever progress changes
//   subs: { [deviceId]: { token } }  one Firebase Cloud Messaging token per phone
//   sent: [tag]  reminders already delivered (written here)
//
// Needs one secret: FIREBASE_SERVICE_ACCOUNT (the service account key, as JSON).

import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const LOOK_BACK = 45 * 60 * 1000; // scheduled runs can start late; still send reminders up to 45 min old
const LOOK_AHEAD = 2 * 60 * 1000;
const KEEP_SENT = 150;

const { FIREBASE_SERVICE_ACCOUNT } = process.env;
if (!FIREBASE_SERVICE_ACCOUNT) {
  console.log('Reminders are not set up yet (missing the FIREBASE_SERVICE_ACCOUNT secret). Nothing to do.');
  process.exit(0);
}

initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const messaging = getMessaging();
const GONE = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

const now = Date.now();
let sentCount = 0;
const users = await db.collection('users').get();

for (const snap of users.docs) {
  const { plan = [], subs = {}, sent = [] } = snap.data();
  const phones = Object.entries(subs).filter(([, s]) => s && s.token);
  if (!phones.length) continue;
  const already = new Set(sent);
  const due = plan.filter((r) => r.at <= now + LOOK_AHEAD && r.at > now - LOOK_BACK && !already.has(r.tag));
  if (!due.length) continue;

  const dead = new Set();
  for (const r of due) {
    for (const [id, sub] of phones) {
      if (dead.has(id)) continue;
      try {
        // Data-only message: the app's service worker (public/push-sw.js) shows it.
        await messaging.send({
          token: sub.token,
          data: { title: r.title, body: r.body, tag: r.tag },
          webpush: { headers: { TTL: '3600', Urgency: 'high' } },
        });
        sentCount++;
      } catch (e) {
        // The phone turned notifications off or the app was removed.
        if (GONE.has(e.code)) dead.add(id);
        else console.warn(`Could not reach a device for ${snap.id}: ${e.code ?? e.message}`);
      }
    }
  }

  const update = { sent: [...sent, ...due.map((r) => r.tag)].slice(-KEEP_SENT) };
  for (const id of dead) update[`subs.${id}`] = FieldValue.delete();
  await snap.ref.update(update);
}

console.log(`Checked ${users.size} user(s), sent ${sentCount} notification(s).`);
