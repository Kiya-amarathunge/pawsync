import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import HealthRecord from "@/models/HealthRecord";
import { verifyToken } from "@/lib/jwt";
import crypto from "crypto";

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

    const record = await HealthRecord.findOne({
      _id: id,
      ownerId: user.userId,
    });

    if (!record) return NextResponse.json({ error: "Health record not found" }, { status: 404 });

    return NextResponse.json({ record });
  } catch (error) {
    console.error("Get health record error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const record = await HealthRecord.findOne({ _id: id, ownerId: user.userId });
    if (!record) return NextResponse.json({ error: "Health record not found" }, { status: 404 });

    Object.assign(record, body);
    record.version += 1;

    const content = JSON.stringify({ petId: record.petId, diagnosis: record.diagnosis, treatment: record.treatment });
    record.checksum = crypto.createHash("sha256").update(content).digest("hex");

    await record.save();

    return NextResponse.json({ message: "Health record updated successfully", record });
  } catch (error) {
    console.error("Update health record error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}