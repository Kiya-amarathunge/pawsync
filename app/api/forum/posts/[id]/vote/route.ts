import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ForumPost from "@/models/ForumPost";
import { verifyToken } from "@/lib/jwt";

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { voteType } = await req.json();
    if (!["upvote", "downvote"].includes(voteType)) {
      return NextResponse.json({ error: "Vote type must be upvote or downvote" }, { status: 400 });
    }

    const post = await ForumPost.findById(id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const userId = user.userId;

    if (voteType === "upvote") {
      const index = post.upvotes.indexOf(userId);
      if (index > -1) {
        post.upvotes.splice(index, 1);
      } else {
        post.upvotes.push(userId);
        const di = post.downvotes.indexOf(userId);
        if (di > -1) post.downvotes.splice(di, 1);
      }
    } else {
      const index = post.downvotes.indexOf(userId);
      if (index > -1) {
        post.downvotes.splice(index, 1);
      } else {
        post.downvotes.push(userId);
        const ui = post.upvotes.indexOf(userId);
        if (ui > -1) post.upvotes.splice(ui, 1);
      }
    }

    await post.save();
    return NextResponse.json({ message: "Vote recorded", post });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}