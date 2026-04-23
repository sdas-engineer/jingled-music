import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import DemoProfileView from "@/components/demo/DemoProfileView";

export const metadata: Metadata = {
  title: "Demo Profile — Replay",
  description: "See what a Replay profile looks like before connecting Spotify.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-replay-bg">
      <Navbar />
      <main className="pt-14">
        <DemoProfileView />
      </main>
    </div>
  );
}
