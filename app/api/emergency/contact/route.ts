import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// POST /api/emergency/contact
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);

    const { clinicId, petId, reason } = await req.json();

    // Log the emergency contact event
    if (user) {
      await AuditLog.create({
        adminId: user.userId,
        actionType: 'EMERGENCY_CONTACT',
        affectedEntity: 'EmergencyContact',
        entityId: clinicId,
        justification: reason || 'Emergency contact made',
      });
    }

    return NextResponse.json({
      message: 'Emergency contact logged successfully',
      instructions: 'Please call the clinic directly for immediate assistance',
    });
  } catch (error) {
    console.error('Emergency contact error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
