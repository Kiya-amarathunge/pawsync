/**
 * PawSync API route: /api/appointments/[id]
 *
 * Domain: appointment booking, scheduling, and status management.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Appointment from "@/models/Appointment";
import "@/models/Pet";
import "@/models/User";
import { verifyToken } from "@/lib/jwt";

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const appointment = await Appointment.findById(id)
      .populate("petId", "name species breed")
      .populate("ownerId", "name email phoneNumber")
      .populate("providerId", "name email");

    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Get appointment error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}