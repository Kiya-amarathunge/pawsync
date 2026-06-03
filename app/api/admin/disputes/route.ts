import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Message from '@/models/Message';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// GET /api/admin/disputes
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Disputes are cancelled appointments that may have issues
    const disputes = await Appointment.find({ status: 'cancelled' })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('ownerId', 'name email')
      .populate('providerId', 'name email')
      .populate('petId', 'name');

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error('Get disputes error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
