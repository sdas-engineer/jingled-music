import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-replay-bg">
      <Navbar />
      <main className="pt-14 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <p className="text-6xl font-black text-replay-text-muted mb-6">404</p>
        <h1 className="text-xl font-semibold text-replay-text-primary mb-3">
          Profile not found
        </h1>
        <p className="text-sm text-replay-text-muted mb-8 max-w-xs">
          This profile does not exist or has been set to private.
        </p>
        <Link
          href="/"
          className="rounded-full border border-replay-border bg-replay-card px-5 py-2 text-sm text-replay-text-secondary hover:text-replay-text-primary transition-colors"
        >
          Back to Jingled
        </Link>
      </main>
    </div>
  );
}
