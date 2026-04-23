import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/spotify";
import { syncRecentPlaysForUser } from "@/lib/sync";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchSize = Math.max(
    1,
    Number.parseInt(process.env.SPOTIFY_CRON_BATCH_SIZE ?? "25", 10) || 25
  );

  const users = await prisma.user.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true },
    take: batchSize,
  });

  let usersProcessed = 0;
  let usersFailed = 0;
  let synced = 0;
  let skipped = 0;
  let total = 0;

  for (const user of users) {
    try {
      const accessToken = await getValidAccessToken(user.id);
      const result = await syncRecentPlaysForUser(user.id, accessToken);
      usersProcessed++;
      synced += result.synced;
      skipped += result.skipped;
      total += result.total;
    } catch {
      usersFailed++;
    }
  }

  return NextResponse.json({
    usersProcessed,
    usersFailed,
    synced,
    skipped,
    total,
  });
}
