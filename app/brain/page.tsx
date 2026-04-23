import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import BrainWorkbench from "@/components/brain/BrainWorkbench";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Play } from "@/types";

export const metadata: Metadata = {
  title: "Brain",
  description: "Interactive neural mood map built from your Spotify listening behavior.",
};

export default async function BrainPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const plays = await prisma.play.findMany({
    where: { userId: user.id },
    orderBy: { playedAt: "desc" },
    take: 2000,
  });

  return (
    <div className="min-h-screen bg-replay-bg">
      <Navbar />

      <main className="pt-16 px-4 pb-4">
        <BrainWorkbench plays={plays as unknown as Play[]} />
      </main>
    </div>
  );
}
