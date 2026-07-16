/**
 * PawSync API route: /api/admin/security/alerts
 *
 * Domain: administration, moderation, reporting, and platform oversight.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import ForumPost from '@/models/ForumPost';
import Review from '@/models/Review';
import Appointment from '@/models/Appointment';
import { getRequestUser } from '@/lib/request-auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB(); const admin = getRequestUser(req); if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [duplicatePhones, flaggedPosts, flaggedReviews, cancellationGroups] = await Promise.all([
      User.aggregate([{ $match: { phoneNumber: { $nin: [null, ''] } } }, { $group: { _id: '$phoneNumber', count: { $sum: 1 }, users: { $push: { id: '$_id', name: '$name', email: '$email' } } } }, { $match: { count: { $gt: 1 } } }]),
      ForumPost.find({ isFlagged: true }).select('authorId title moderationReason').lean(),
      Review.find({ isFlagged: true }).select('ownerId moderationReason').lean(),
      Appointment.aggregate([{ $match: { status: 'cancelled', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }, { $group: { _id: '$ownerId', count: { $sum: 1 } } }, { $match: { count: { $gte: 5 } } }]),
    ]);
    const alerts = [
      ...duplicatePhones.map(item => ({ type: 'duplicate_accounts', severity: 'high', entityId: item.users[0]?.id, message: `${item.count} accounts share phone ${item._id}`, details: item.users })),
      ...flaggedPosts.map(item => ({ type: 'forum_spam', severity: 'medium', entityId: item.authorId, message: `Flagged forum topic: ${item.title}`, details: item.moderationReason })),
      ...flaggedReviews.map(item => ({ type: 'review_abuse', severity: 'medium', entityId: item.ownerId, message: 'Flagged review content', details: item.moderationReason })),
      ...cancellationGroups.map(item => ({ type: 'excessive_cancellations', severity: 'medium', entityId: item._id, message: `${item.count} cancellations in the last 30 days` })),
    ];
    return NextResponse.json({ alerts });
  } catch (error) { console.error('Security alerts error:', error); return NextResponse.json({ error: 'Unable to analyze suspicious activity' }, { status: 500 }); }
}
