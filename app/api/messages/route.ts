import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import "@/models/User";
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
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sentMessages = await Message.find({ senderId: user.userId }).distinct("receiverId");
    const receivedMessages = await Message.find({ receiverId: user.userId }).distinct("senderId");

    const conversationUserIds = [
      ...new Set([...sentMessages.map(String), ...receivedMessages.map(String)]),
    ];

    const conversations = await Promise.all(
      conversationUserIds.map(async (otherId) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: user.userId, receiverId: otherId },
            { senderId: otherId, receiverId: user.userId },
          ],
        })
          .sort({ createdAt: -1 })
          .populate("senderId", "name")
          .populate("receiverId", "name");

        const unreadCount = await Message.countDocuments({
          senderId: otherId,
          receiverId: user.userId,
          isRead: false,
        });

        return { lastMessage, unreadCount, otherId };
      })
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { receiverId, content } = await req.json();

    if (!receiverId || !content) {
      return NextResponse.json({ error: "Receiver and content are required" }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: "Message cannot exceed 1000 characters" }, { status: 400 });
    }

    const message = await Message.create({
      senderId: user.userId,
      receiverId,
      content,
    });

    await Notification.create({
      userId: receiverId,
      type: "NEW_MESSAGE",
      message: "You have a new message",
      isRead: false,
    });

    return NextResponse.json({ message: "Message sent successfully", data: message }, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
