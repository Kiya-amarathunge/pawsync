/**
 * PawSync API route: /api/health-records/[id]/download
 *
 * Domain: encrypted pet health-record management.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import connectDB from '@/lib/db';
import HealthRecord from '@/models/HealthRecord';
import Pet from '@/models/Pet';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { findAccessiblePet } from '@/lib/pet-access';
import { decryptHealthPayload } from '@/lib/health-encryption';

function createPdf(data: {
  petName: string;
  date: Date;
  diagnosis: string;
  treatment: string;
  prescriptions: string[];
  version: number;
}) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, info: { Title: `${data.petName} health record` } });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(22).fillColor('#1d6f55').text('PawSync Health Report');
    doc.moveDown(0.4).fontSize(12).fillColor('#333').text(`Pet: ${data.petName}`);
    doc.text(`Record date: ${data.date.toLocaleDateString()}`);
    doc.text(`Version: ${data.version}`);
    doc.moveDown().fontSize(14).fillColor('#1d6f55').text('Diagnosis');
    doc.fontSize(11).fillColor('#222').text(data.diagnosis || 'Not specified');
    doc.moveDown().fontSize(14).fillColor('#1d6f55').text('Treatment');
    doc.fontSize(11).fillColor('#222').text(data.treatment || 'Not specified');
    doc.moveDown().fontSize(14).fillColor('#1d6f55').text('Prescriptions');
    doc.fontSize(11).fillColor('#222').list(data.prescriptions.length ? data.prescriptions : ['None']);
    doc.moveDown(2).fontSize(9).fillColor('#666').text(`Generated securely by PawSync on ${new Date().toLocaleString()}`);
    doc.end();
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const record = await HealthRecord.findById(id).select('+encryptedData +encryptionIv +encryptionTag');
    if (!record || !await findAccessiblePet(String(record.petId), user)) {
      return NextResponse.json({ error: 'Health record not found or access not granted' }, { status: 404 });
    }
    const pet = await Pet.findById(record.petId).select('name');
    const payload = decryptHealthPayload(record);
    const pdf = await createPdf({
      petName: pet?.name || 'Pet',
      date: record.date,
      diagnosis: payload.diagnosis,
      treatment: payload.treatment,
      prescriptions: payload.prescriptions,
      version: record.version,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(pet?.name || 'pet').replace(/[^a-z0-9]/gi, '-')}-health-report.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Download health report error:', error);
    return NextResponse.json({ error: 'Unable to generate health report' }, { status: 500 });
  }
}
