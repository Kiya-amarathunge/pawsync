import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const weightData = {
      labels: [new Date().toLocaleDateString()],
      datasets: [{
        label: `${pet.name} Weight (kg)`,
        data: [pet.weight || 0],
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29, 158, 117, 0.1)',
      }],
    };
    const vaccinationLabels = pet.vaccinationHistory.map((v: any) =>
      new Date(v.date).toLocaleDateString()
    );
    const vaccinationData = {
      labels: vaccinationLabels,
      datasets: [{
        label: 'Vaccinations',
        data: pet.vaccinationHistory.map((_: any, i: number) => i + 1),
        backgroundColor: '#378ADD',
      }],
    };
    const upcomingVaccinations = pet.vaccinationHistory
      .filter((v: any) => v.nextDueDate && new Date(v.nextDueDate) > new Date())
      .map((v: any) => ({
        vaccine: v.vaccine,
        dueDate: v.nextDueDate,
      }));
    return NextResponse.json({ weightData, vaccinationData, upcomingVaccinations });
  } catch (error) {
    console.error('Chart data error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}