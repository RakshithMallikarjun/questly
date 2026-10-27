// Sends Questly reminders to phones. Runs every 10 minutes from GitHub Actions.
//
// Each user's document (users/{uid}) holds:
//   plan: [{ at, tag, title, body }]  written by the app whenever progress changes
//   subs: { [deviceId]: PushSubscription }  one per phone with notifications on
//   sent: [tag]  reminders already delivered (written here)
//
// Needs two secrets: FIREBASE_SERVICE_ACCOUNT (JSON) and VAPID_PRIVATE_KEY.

import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = 'BOPWhw1nDRa5UyHkwam8CFKfnMMMmVK-Vf_qA136VfTpArkYMHmVwYX8pyE9DGjgY5nKucWtjMbNEskB787RnnM';
const LOOK_BACK = 45 * 60 * 1000; // scheduled runs can start late; still send reminders up to 45 min old
const LOOK_AHEAD = 2 * 60 * 1000;
const KEEP_SENT = 150;

const { FIREBASE_SERVICE_ACCOUNT, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
if (!FIREBASE_SERVICE_ACCOUNT || !VAPID_PRIVATE_KEY) {
  console.log('Reminders are not set up yet (missing FIREBASE_SERVICE_ACCOUNT or VAPID_PRIVATE_KEY). Nothing to do.');
  process.exit(0);
}

initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
webpush.setVapidDetails(VAPID_SUBJECT || 'https://github.com/RakshithMallikarjun/questly', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const db = getFirestore();

const now = Date.now();
let sentCount = 0;
const users = await db.collection('users').get();

for (const snap of users.docs) {
  const { plan = [], subs = {}, sent = [] } = snap.data();
  const phones = Object.entries(subs).filter(([, s]) => s && s.endpoint);
  if (!phones.length) continue;
  const already = new Set(sent);
  const due = plan.filter((r) => r.at <= now + LOOK_AHEAD && r.at > now - LOOK_BACK && !already.has(r.tag));
  if (!due.length) continue;

  const dead = new Set();
  for (const r of due) {
    const payload = JSON.stringify({ title: r.title, body: r.body, tag: r.tag });
    for (const [id, sub] of phones) {
      if (dead.has(id)) continue;
      try {
        await webpush.sendNotification(sub, payload, { TTL: 3600, urgency: 'high' });
        sentCount++;
      } catch (e) {
        // 404/410: the phone turned notifications off or the app was removed.
        if (e.statusCode === 404 || e.statusCode === 410) dead.add(id);
        else console.warn(`Could not reach a device for ${snap.id}: ${e.statusCode ?? e.message}`);
      }
    }
  }

  const update = { sent: [...sent, ...due.map((r) => r.tag)].slice(-KEEP_SENT) };
  for (const id of dead) update[`subs.${id}`] = FieldValue.delete();
  await snap.ref.update(update);
}

console.log(`Checked ${users.size} user(s), sent ${sentCount} notification(s).`);
