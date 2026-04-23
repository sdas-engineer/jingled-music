import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDayMap, buildYearGrid, getMonthLabels, getTopArtistsFromPlays } from "@/lib/graph-data";
import { detectEras, generateHeadline } from "@/lib/era";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profile: true,
      plays: {
        orderBy: { playedAt: "desc" },
        take: 5000,
      },
    },
  });

  if (!user || !user.profile?.isPublic) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const year = new Date().getFullYear();
  const dayMap = buildDayMap(user.plays);
  const weeks = buildYearGrid(year, dayMap);
  const monthLabels = getMonthLabels(year, weeks);
  const eras = detectEras(user.plays);
  const topArtists = getTopArtistsFromPlays(user.plays, 5);
  const headline = user.profile.headline ?? generateHeadline(user.plays);

  const totalMinutes = user.plays.reduce((sum, p) => sum + p.durationMs / 60000, 0);
  const uniqueTracks = new Set(user.plays.map((p) => p.trackId)).size;
  const uniqueArtists = new Set(user.plays.map((p) => p.artistId)).size;

  return NextResponse.json({
    profile: {
      username: user.username,
      displayName: user.displayName,
      profileImage: user.profileImage,
      headline,
      joinedAt: user.createdAt,
    },
    stats: {
      totalPlays: user.plays.length,
      totalMinutes: Math.round(totalMinutes),
      uniqueTracks,
      uniqueArtists,
    },
    graph: { weeks, monthLabels, year },
    eras,
    topArtists,
    currentObsession: topArtists[0] ?? null,
  });
}
