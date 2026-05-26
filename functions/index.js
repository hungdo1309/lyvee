const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

admin.initializeApp();

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

exports.sendPushEvent = functions.firestore
  .document('pushEvents/{eventId}')
  .onCreate(async (snap) => {
    const event = snap.data();
    const db = admin.firestore();
    const messages = [];

    for (const userId of event.recipientIds || []) {
      const userSnap = await db.doc(`users/${userId}`).get();
      if (!userSnap.exists) continue;

      for (const token of collectPushTokens(userSnap.data())) {
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
    }

    if (messages.length === 0) {
      await snap.ref.update({
        status: 'skipped',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const tickets = [];
    for (const chunk of expo.chunkPushNotifications(messages)) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    await snap.ref.update({
      status: 'sent',
      ticketCount: tickets.length,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
