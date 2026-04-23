import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/spotify";
import { runBrainAgentChat } from "@/lib/ai";
import { enforceSlidingWindowRateLimit } from "@/lib/rate-limit";
import type { BrainChatRequest } from "@/types";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(1200),
      })
    )
    .min(1)
    .max(20),
  mode: z.enum(["recent", "daily", "cluster"]).optional(),
  selectedDate: z.string().max(32).optional(),
  selectedCluster: z.string().max(64).optional(),
  recommendationMode: z.enum(["discovery", "familiar"]).optional(),
  avoidTrackIds: z.array(z.string().min(1).max(64)).max(80).optional(),
  diversitySeed: z.number().int().optional(),
});

const RATE_LIMIT_PER_MIN = Number(process.env.AI_CHAT_RATE_LIMIT_PER_MIN || "20");

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = enforceSlidingWindowRateLimit({
    key: `brain-chat:${user.id}`,
    limit: Math.max(1, RATE_LIMIT_PER_MIN),
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const input = parsed.data as BrainChatRequest;
    const accessToken = await getValidAccessToken(user.id);
    const response = await runBrainAgentChat({
      request: input,
      userId: user.id,
      accessToken,
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Brain chat failed:", error);
    return NextResponse.json({ error: "Brain assistant is currently unavailable." }, { status: 500 });
  }
}
