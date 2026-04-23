import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-replay-bg">
      <Navbar />
      <main className="pt-14 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <p className="text-6xl font-black text-replay-text-muted mb-6">404</p>
        <h1 className="text-xl font-semibold text-replay-text-primary mb-3">
          Page not found
        </h1>
        <p className="text-sm text-replay-text-muted mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="rounded-full border border-replay-border bg-replay-card px-5 py-2 text-sm text-replay-text-secondary hover:text-replay-text-primary transition-colors"
        >
          Back to Replay
        </Link>
      </main>
    </div>
  );
}
