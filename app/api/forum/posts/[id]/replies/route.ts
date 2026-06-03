import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ForumPost from "@/models/ForumPost";
import { verifyToken } from "@/lib/jwt";
import mongoose from "mongoose";

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: "Reply content is required" }, { status: 400 });

    const post = await ForumPost.findById(id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const isVetVerified = user.role === "veterinarian";

    post.replies.push({
      replyId: new mongoose.Types.ObjectId(),
      authorId: user.userId,
      content,
      isVetVerified,
      upvotes: [],
      createdAt: new Date(),
    });

    await post.save();

    return NextResponse.json({ message: "Reply added successfully", post }, { status: 201 });
  } catch (error) {
    console.error("Add reply error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}