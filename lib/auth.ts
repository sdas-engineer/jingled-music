import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { User } from "@/types";

const SESSION_COOKIE = "jingled-session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "fallback-dev-secret-change-in-production-32ch"
);

export async function createSession(userId: string): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  return token;
}

export async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      spotifyId: true,
      username: true,
      displayName: true,
      profileImage: true,
      email: true,
      createdAt: true,
    },
  });

  return user as User | null;
}

export function setSessionCookie(token: string): { name: string; value: string; httpOnly: boolean; secure: boolean; sameSite: "lax"; maxAge: number; path: string } {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  };
}

export function clearSessionCookie(): { name: string; value: string; httpOnly: boolean; maxAge: number; path: string } {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  };
}

export { SESSION_COOKIE };
