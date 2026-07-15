import crypto from 'crypto';
import webpush from 'web-push';
import Notification from '@/models/Notification';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';

interface NotificationInput {
  userId: string | object;
  type: string;
  message: string;
  actionUrl?: string;
  relatedEntityId?: string | object;
  force?: boolean;
}

function categoryEnabled(type: string, preferences: Record<string, boolean>) {
  // Notification event names are grouped into the preference categories shown in the UI.
  if (type.includes('APPOINTMENT') || type.includes('BOOKING')) return preferences.appointmentReminders !== false;
  if (type.includes('VACCINATION') || type.includes('MEDICATION') || type.includes('HEALTH')) return preferences.healthReminders !== false;
  if (type.includes('MESSAGE')) return preferences.messages !== false;
  if (type.includes('REVIEW')) return preferences.reviews !== false;
  if (type.includes('ANNOUNCEMENT') || type.includes('ALERT')) return preferences.announcements !== false;
  return true;
}

export async function createNotification(input: NotificationInput) {
  const user = await User.findById(input.userId).select('notificationPreferences');
  if (!user) return null;
  const preferences = user.notificationPreferences || {};
  if (!input.force && (!preferences.inApp || !categoryEnabled(input.type, preferences))) return null;
  // Suppress identical events created by retries or overlapping scheduled jobs.
  const dedupeKey = crypto.createHash('sha256').update(`${input.type}:${input.message}`).digest('hex');
  const recent = await Notification.findOne({ userId: input.userId, dedupeKey, createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } });
  if (recent) return recent;
  const notification = await Notification.create({ ...input, dedupeKey, isRead: false });
  if (preferences.push && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    // Push is an additional delivery channel; the database notification remains the source of truth.
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@pawsync.local', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const subscriptions = await PushSubscription.find({ userId: input.userId });
    const payload = JSON.stringify({ title: 'PawSync', body: input.message, url: input.actionUrl || '/notifications' });
    const results = await Promise.allSettled(subscriptions.map(subscription => webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload)));
    if (results.some(result => result.status === 'fulfilled')) { notification.deliveredViaPush = true; await notification.save(); }
  }
  return notification;
}
