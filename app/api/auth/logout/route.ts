import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  const response = NextResponse.redirect(`${APP_URL}/`);
  const cookie = clearSessionCookie();
  response.cookies.set(cookie);
  return response;
}
