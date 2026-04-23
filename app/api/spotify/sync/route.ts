import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/spotify";
import { syncRecentPlaysForUser } from "@/lib/sync";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getValidAccessToken(user.id);
    const result = await syncRecentPlaysForUser(user.id, accessToken);
    if (result.total === 0) {
      return NextResponse.json({ synced: 0, message: "No recent plays found" });
    }

    return NextResponse.json({
      synced: result.synced,
      skipped: result.skipped,
      total: result.total,
      message: `Synced ${result.synced} plays`,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
