import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("Please define the JWT_SECRET environment variable in .env.local");
}

export type UserRole = "pet_owner" | "veterinarian" | "service_provider" | "admin";

export interface TokenPayload extends JwtPayload {
  userId: string;
  role?: UserRole;
  email?: string;
  purpose?: "verify-email" | "reset-password";
  adminRole?: "super_admin" | "content_moderator" | "verification_specialist";
}

export function signAccessToken(payload: object, expiresIn: jwt.SignOptions["expiresIn"] = "24h"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function signRefreshToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return typeof decoded === "string" ? null : decoded as TokenPayload;
  } catch {
    return null;
  }
}
