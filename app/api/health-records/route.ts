import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import HealthRecord from '@/models/HealthRecord';
import '@/models/User';
import '@/models/Pet';
import { verifyToken } from '@/lib/jwt';
import crypto from 'crypto';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/health-records?petId=...
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const petId = searchParams.get('petId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const filter: any = { ownerId: user.userId };
    if (petId) filter.petId = petId;
    if (search) {
      filter.$or = [
        { diagnosis: { $regex: search, $options: 'i' } },
        { treatment: { $regex: search, $options: 'i' } },
      ];
    }

    const records = await HealthRecord.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await HealthRecord.countDocuments(filter);

    return NextResponse.json({ records, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get health records error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// POST /api/health-records
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { petId, diagnosis, treatment, prescriptions, date } = body;

    if (!petId) return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });

    const content = JSON.stringify({ petId, diagnosis, treatment, prescriptions });
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    const record = await HealthRecord.create({
      petId,
      ownerId: user.userId,
      date: date ? new Date(date) : new Date(),
      diagnosis,
      treatment,
      prescriptions: prescriptions || [],
      addedBy: user.userId,
      version: 1,
      checksum,
    });

    return NextResponse.json({ message: 'Health record created successfully', record }, { status: 201 });
  } catch (error) {
    console.error('Create health record error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
