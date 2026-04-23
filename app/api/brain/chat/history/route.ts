import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BrainChatMessage, BrainChatSongCard } from "@/types";

const conversationSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(80),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(1200),
      })
    )
    .max(80),
  songCards: z
    .array(
      z.object({
        trackId: z.string().min(1).max(64),
        trackName: z.string().min(1).max(200),
        artistName: z.string().min(1).max(200),
        spotifyUrl: z.string().url(),
        albumImage: z.string().url().nullable().optional(),
      })
    )
    .max(40),
});

const deleteSchema = z.object({
  id: z.string().min(1).max(64),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.brainChatConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  return NextResponse.json({
    conversations: rows.map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updatedAt.getTime(),
      messages: row.messages as unknown as BrainChatMessage[],
      songCards: row.songCards as unknown as BrainChatSongCard[],
    })),
  });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = conversationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid conversation payload." }, { status: 400 });
  }

  const data = parsed.data;
  const existing = await prisma.brainChatConversation.findUnique({
    where: { id: data.id },
    select: { id: true, userId: true },
  });
  if (existing && existing.userId !== user.id) {
    return NextResponse.json({ error: "Conversation id conflict." }, { status: 403 });
  }

  const persisted = await prisma.brainChatConversation.upsert({
    where: { id: data.id },
    update: {
      title: data.title,
      messages: data.messages,
      songCards: data.songCards,
      userId: user.id,
    },
    create: {
      id: data.id,
      userId: user.id,
      title: data.title,
      messages: data.messages,
      songCards: data.songCards,
    },
  });

  const oldRows = await prisma.brainChatConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    skip: 50,
    select: { id: true },
  });
  if (oldRows.length > 0) {
    await prisma.brainChatConversation.deleteMany({
      where: { id: { in: oldRows.map((row) => row.id) } },
    });
  }

  return NextResponse.json({
    id: persisted.id,
    updatedAt: persisted.updatedAt.getTime(),
  });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const idFromQuery = url.searchParams.get("id");
  const payload = idFromQuery ? { id: idFromQuery } : await req.json();
  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete payload." }, { status: 400 });
  }

  const target = await prisma.brainChatConversation.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, userId: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  if (target.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.brainChatConversation.delete({
    where: { id: target.id },
  });
  return NextResponse.json({ deleted: true, id: target.id });
}
