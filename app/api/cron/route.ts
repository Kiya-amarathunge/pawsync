import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { sendSMS } from '@/lib/twilio';

// GET /api/cron — called by Vercel Cron or manually every hour
// Add this to vercel.json crons config to run automatically
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const now = new Date();

    // Find appointments 24 hours from now (within a 5 min window)
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24hEnd = new Date(in24h.getTime() + 5 * 60 * 1000);

    // Find appointments 2 hours from now (within a 5 min window)
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in2hEnd = new Date(in2h.getTime() + 5 * 60 * 1000);

    const [appointments24h, appointments2h] = await Promise.all([
      Appointment.find({
        dateTime: { $gte: in24h, $lte: in24hEnd },
        status: { $in: ['confirmed', 'pending'] },
      }).populate('ownerId', 'name phoneNumber'),
      Appointment.find({
        dateTime: { $gte: in2h, $lte: in2hEnd },
        status: { $in: ['confirmed', 'pending'] },
      }).populate('ownerId', 'name phoneNumber'),
    ]);

    let reminders24h = 0;
    let reminders2h = 0;

    // Send 24h reminders
    for (const appt of appointments24h) {
      const owner = appt.ownerId as any;
      const msg = `Reminder: You have a ${appt.serviceType} appointment tomorrow at ${new Date(appt.dateTime).toLocaleTimeString()}`;

      await Notification.create({
        userId: owner._id,
        type: 'APPOINTMENT_REMINDER_24H',
        message: msg,
        isRead: false,
      });

      if (owner.phoneNumber) {
        await sendSMS(owner.phoneNumber, `PawSync: ${msg}`);
      }

      reminders24h++;
    }

    // Send 2h reminders
    for (const appt of appointments2h) {
      const owner = appt.ownerId as any;
      const msg = `Reminder: You have a ${appt.serviceType} appointment in 2 hours at ${new Date(appt.dateTime).toLocaleTimeString()}`;

      await Notification.create({
        userId: owner._id,
        type: 'APPOINTMENT_REMINDER_2H',
        message: msg,
        isRead: false,
      });

      if (owner.phoneNumber) {
        await sendSMS(owner.phoneNumber, `PawSync: ${msg}`);
      }

      reminders2h++;
    }

    return NextResponse.json({
      message: 'Reminders processed successfully',
      reminders24h,
      reminders2h,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
