import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Review from "@/models/Review";
import "@/models/User";
import Appointment from "@/models/Appointment";
import Notification from "@/models/Notification";
import { verifyToken } from "@/lib/jwt";

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = req.nextUrl;
    const providerId = searchParams.get("providerId");
    const rating = searchParams.get("rating");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    const filter: any = {};
    if (providerId) filter.providerId = providerId;
    if (rating) filter.rating = parseInt(rating);

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("ownerId", "name");

    const total = await Review.countDocuments(filter);

    return NextResponse.json({ reviews, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { appointmentId, rating, comment, photos } = await req.json();

    if (!appointmentId || !rating || !comment) {
      return NextResponse.json({ error: "Appointment, rating and comment are required" }, { status: 400 });
    }

    if (comment.length < 50) {
      return NextResponse.json({ error: "Review comment must be at least 50 characters" }, { status: 400 });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      ownerId: user.userId,
      status: "completed",
    });

    if (!appointment) {
      return NextResponse.json({ error: "You can only review completed appointments" }, { status: 403 });
    }

    const existingReview = await Review.findOne({ appointmentId });
    if (existingReview) {
      return NextResponse.json({ error: "You have already reviewed this appointment" }, { status: 409 });
    }

    const editDeadline = new Date();
    editDeadline.setHours(editDeadline.getHours() + 48);

    const review = await Review.create({
      appointmentId,
      providerId: appointment.providerId,
      ownerId: user.userId,
      rating,
      comment,
      photos: photos || [],
      editDeadline,
    });

    await Notification.create({
      userId: appointment.providerId,
      type: "NEW_REVIEW",
      message: `You received a new ${rating}-star review`,
      isRead: false,
    });

    return NextResponse.json({ message: "Review submitted successfully", review }, { status: 201 });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
