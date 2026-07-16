/**
 * PawSync API route: /api/provider/dashboard/report
 *
 * Domain: provider profiles, dashboards, and operations.
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
import Appointment from '@/models/Appointment';
import { getRequestUser, hasRole } from '@/lib/request-auth';

function renderReport(rows: Array<{ dateTime: Date; serviceType: string; price: number }>, providerName: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, info: { Title: 'PawSync Financial Report' } }); const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(Buffer.from(chunk))); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    doc.fontSize(22).fillColor('#1d6f55').text('PawSync Financial Report'); doc.moveDown(0.5).fontSize(11).fillColor('#333').text(`Provider: ${providerName}`); doc.text(`Generated: ${new Date().toLocaleString()}`); doc.moveDown();
    rows.forEach(row => doc.fontSize(10).text(`${row.dateTime.toLocaleDateString()}  ${row.serviceType.padEnd(18)}  Rs. ${(row.price || 0).toLocaleString()}`));
    doc.moveDown().fontSize(14).fillColor('#1d6f55').text(`Total: Rs. ${rows.reduce((sum, row) => sum + (row.price || 0), 0).toLocaleString()}`); doc.end();
  });
}

export async function GET(req: NextRequest) {
  try {
    await connectDB(); const user = getRequestUser(req); if (!hasRole(user, ['veterinarian', 'service_provider'])) return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    const from = req.nextUrl.searchParams.get('from'); const to = req.nextUrl.searchParams.get('to');
    const dateFilter: Record<string, Date> = {}; if (from) dateFilter.$gte = new Date(`${from}T00:00:00`); if (to) dateFilter.$lte = new Date(`${to}T23:59:59`);
    const appointments = await Appointment.find({ providerId: user.userId, status: 'completed', ...(Object.keys(dateFilter).length ? { dateTime: dateFilter } : {}) }).sort({ dateTime: 1 });
    const pdf = await renderReport(appointments, user.email || 'Provider');
    return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="pawsync-financial-report.pdf"', 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('Provider financial report error:', error); return NextResponse.json({ error: 'Unable to generate report' }, { status: 500 }); }
}
