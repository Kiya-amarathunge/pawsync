/**
 * PawSync API route: /api/pets/[id]/chart-data
 *
 * Domain: pet profiles and care information.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import { getRequestUser } from '@/lib/request-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const filter = user.role === 'veterinarian'
      ? { _id: id, 'sharedWith.veterinarianId': user.userId }
      : { _id: id, ownerId: user.userId };
    const pet = await Pet.findOne(filter);
    if (!pet) return NextResponse.json({ error: 'Pet not found or access not granted' }, { status: 404 });
    const weightHistory = [...pet.weightHistory].sort((a, b) => a.date.getTime() - b.date.getTime());
    const upcomingVaccinations = pet.vaccinationHistory
      .filter((vaccination: { nextDueDate?: Date }) => vaccination.nextDueDate && vaccination.nextDueDate > new Date())
      .sort((a: { nextDueDate: Date }, b: { nextDueDate: Date }) => a.nextDueDate.getTime() - b.nextDueDate.getTime());
    return NextResponse.json({
      weightData: {
        labels: weightHistory.map(entry => entry.date.toISOString()),
        datasets: [{
          label: `${pet.name} weight (kg)`,
          data: weightHistory.map(entry => entry.weight),
          borderColor: '#1D9E75',
          backgroundColor: 'rgba(29, 158, 117, 0.12)',
          tension: 0.25,
        }],
      },
      vaccinationData: pet.vaccinationHistory.map((vaccination: { vaccine: string; date: Date; nextDueDate?: Date }) => ({
        vaccine: vaccination.vaccine,
        administeredAt: vaccination.date,
        nextDueDate: vaccination.nextDueDate,
        overdue: Boolean(vaccination.nextDueDate && vaccination.nextDueDate < new Date()),
      })),
      upcomingVaccinations,
      medicationSchedules: pet.medicationSchedules,
      dietHistory: pet.dietHistory,
    });
  } catch (error) {
    console.error('Get pet chart data error:', error);
    return NextResponse.json({ error: 'Unable to load chart data' }, { status: 500 });
  }
}
