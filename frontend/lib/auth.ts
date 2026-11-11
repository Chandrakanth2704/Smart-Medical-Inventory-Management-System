import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "medistock_session";
const SESSION_DURATION = 60 * 30; // 30 minutes

const secretValue = process.env.SESSION_SECRET;

if (!secretValue || secretValue.length < 32) {
  throw new Error(
    "SESSION_SECRET must contain at least 32 characters."
  );
}

const secret = new TextEncoder().encode(secretValue);

export type UserRole = "ADMIN" | "CUSTOMER";

export interface SessionUser {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);

    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.fullName !== "string" ||
      typeof payload.email !== "string" ||
      !["ADMIN", "CUSTOMER"].includes(String(payload.role))
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      username: payload.username,
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<SessionUser | null> {
  const session = await getSession();

  if (!session || !allowedRoles.includes(session.role)) {
    return null;
  }

  return session;
}
