import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "ec_hybrid_secure_jwt_token_auth_secret_key_2026_xoxo";
const COOKIE_NAME = "ec_auth_token";

export interface TokenPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "HR";
  name: string;
  department: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Server-side session verification.
 * Enforces role check on every request against the active database state.
 */
export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;

    // Verify user is still active in DB on every request (prevents inactive accounts / role changes from persisting)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, department: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as TokenPayload["role"],
      department: user.department,
    };
  } catch (error) {
    console.error("Auth session error:", error);
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Server-side authorization check.
 * Throws or returns null if user is unauthorized.
 */
export async function requireAuth(allowedRoles?: Array<"ADMIN" | "MANAGER" | "EMPLOYEE" | "HR">) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Authentication required", status: 401, user: null };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: `Forbidden: requires ${allowedRoles.join(" or ")} role`, status: 403, user: null };
  }

  return { error: null, status: 200, user };
}
