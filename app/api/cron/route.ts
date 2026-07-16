/**
 * PawSync API route: /api/cron
 *
 * Domain: protected scheduled maintenance and reminder processing.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Pet from '@/models/Pet';
import { sendSMS } from '@/lib/twilio';
import { createNotification } from '@/lib/notifications';

interface ReminderOwner {
  _id: string;
  phoneNumber?: string;
  notificationPreferences?: { sms?: boolean };
}

// GET /api/cron — called by Vercel Cron or manually every hour
// Add this to vercel.json crons config to run automatically
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }
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
        reminder24hSent: false,
      }).populate('ownerId', 'name phoneNumber notificationPreferences'),
      Appointment.find({
        dateTime: { $gte: in2h, $lte: in2hEnd },
        status: { $in: ['confirmed', 'pending'] },
        reminder2hSent: false,
      }).populate('ownerId', 'name phoneNumber notificationPreferences'),
    ]);

    let reminders24h = 0;
    let reminders2h = 0;
    let healthReminders = 0;
    let reviewRequests = 0;

    // Send 24h reminders
    for (const appt of appointments24h) {
      const owner = appt.ownerId as unknown as ReminderOwner;
      const msg = `Reminder: You have a ${appt.serviceType} appointment tomorrow at ${new Date(appt.dateTime).toLocaleTimeString()}`;

      await Promise.all([
        createNotification({ userId: owner._id, type: 'APPOINTMENT_REMINDER_24H', message: msg, actionUrl: '/appointments' }),
        createNotification({ userId: appt.providerId, type: 'APPOINTMENT_REMINDER_24H', message: msg, actionUrl: '/provider/appointments' }),
      ]);

      if (owner.phoneNumber && owner.notificationPreferences?.sms) {
        await sendSMS(owner.phoneNumber, `PawSync: ${msg}`);
      }

      appt.reminder24hSent = true;
      await appt.save();

      reminders24h++;
    }

    // Send 2h reminders
    for (const appt of appointments2h) {
      const owner = appt.ownerId as unknown as ReminderOwner;
      const msg = `Reminder: You have a ${appt.serviceType} appointment in 2 hours at ${new Date(appt.dateTime).toLocaleTimeString()}`;

      await Promise.all([
        createNotification({ userId: owner._id, type: 'APPOINTMENT_REMINDER_2H', message: msg, actionUrl: '/appointments' }),
        createNotification({ userId: appt.providerId, type: 'APPOINTMENT_REMINDER_2H', message: msg, actionUrl: '/provider/appointments' }),
      ]);

      if (owner.phoneNumber && owner.notificationPreferences?.sms) {
        await sendSMS(owner.phoneNumber, `PawSync: ${msg}`);
      }

      appt.reminder2hSent = true;
      await appt.save();

      reminders2h++;
    }

    const vaccinationWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const pets = await Pet.find({
      $or: [
        { vaccinationHistory: { $elemMatch: { nextDueDate: { $gte: now, $lte: vaccinationWindow }, reminderSent: false } } },
        { medicationSchedules: { $elemMatch: { nextReminderAt: { $lte: now } } } },
      ],
    });
    for (const pet of pets) {
      for (const vaccination of pet.vaccinationHistory) {
        if (vaccination.nextDueDate && vaccination.nextDueDate >= now && vaccination.nextDueDate <= vaccinationWindow && !vaccination.reminderSent) {
          await createNotification({ userId: pet.ownerId, type: 'VACCINATION_REMINDER', message: `${pet.name}: ${vaccination.vaccine} is due on ${vaccination.nextDueDate.toLocaleDateString()}`, actionUrl: '/pets' });
          vaccination.reminderSent = true;
          healthReminders++;
        }
      }
      for (const medication of pet.medicationSchedules) {
        if (medication.nextReminderAt && medication.nextReminderAt <= now && (!medication.lastReminderSentAt || medication.lastReminderSentAt < medication.nextReminderAt)) {
          await createNotification({ userId: pet.ownerId, type: 'MEDICATION_REMINDER', message: `${pet.name}: ${medication.medication} ${medication.dosage} (${medication.frequency})`, actionUrl: '/pets' });
          medication.lastReminderSentAt = now;
          healthReminders++;
        }
      }
      await pet.save();
    }

    const reviewCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const completedAppointments = await Appointment.find({ status: 'completed', reviewRequested: false, statusUpdatedAt: { $lte: reviewCutoff } });
    for (const appointment of completedAppointments) {
      await createNotification({ userId: appointment.ownerId, type: 'REVIEW_REQUEST', message: `How was your ${appointment.serviceType} appointment? Share a verified review.`, actionUrl: '/appointments' });
      appointment.reviewRequested = true;
      await appointment.save();
      reviewRequests++;
    }

    return NextResponse.json({
      message: 'Reminders processed successfully',
      reminders24h,
      reminders2h,
      healthReminders,
      reviewRequests,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
