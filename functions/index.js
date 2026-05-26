const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { Expo } = require('expo-server-sdk');

initializeApp();

const expo = new Expo();

function collectPushTokens(userData) {
  const tokens = [];
  if (Array.isArray(userData.pushTokens)) {
    tokens.push(...userData.pushTokens);
  }
  if (typeof userData.pushToken === 'string') {
    tokens.push(userData.pushToken);
  }
  return [...new Set(tokens.filter(Boolean))];
}

function buildMessages(event, tokens) {
  const messages = [];
  for (const token of tokens) {
    if (!Expo.isExpoPushToken(token)) continue;
    messages.push({
      to: token,
      sound: 'default',
      title: event.title,
      body: event.body,
      data: event.data || { type: event.type },
      channelId: 'activity',
    });
  }
  return messages;
}

async function resolveTokensFromUsers(db, recipientIds) {
  const tokens = [];

  for (let i = 0; i < recipientIds.length; i += 10) {
    const chunk = recipientIds.slice(i, i + 10);
    const refs = chunk.map((userId) => db.doc(`users/${userId}`));
    const userSnaps = refs.length > 0 ? await db.getAll(...refs) : [];

    for (const userSnap of userSnaps) {
      if (!userSnap.exists) continue;
      tokens.push(...collectPushTokens(userSnap.data()));
    }
  }

  return [...new Set(tokens)];
}

exports.sendPushEvent = onDocumentCreated(
  {
    document: 'pushEvents/{eventId}',
    region: 'us-central1',
    memory: '128MiB',
    timeoutSeconds: 30,
  },
  async (firestoreEvent) => {
    const snap = firestoreEvent.data;
    if (!snap) return;

    const event = snap.data();
    const db = getFirestore();

    try {
      const embeddedTokens = Array.isArray(event.pushTokens)
        ? [...new Set(event.pushTokens.filter(Boolean))]
        : [];
      const tokens =
        embeddedTokens.length > 0
          ? embeddedTokens
          : await resolveTokensFromUsers(db, event.recipientIds || []);
      const messages = buildMessages(event, tokens);

      if (messages.length === 0) {
        return;
      }

      for (const chunk of expo.chunkPushNotifications(messages)) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      console.error('[push] sendPushEvent failed:', error);
    } finally {
      await snap.ref.delete().catch((error) => {
        console.warn('[push] failed to delete pushEvent:', error);
      });
    }
  }
);
