import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import LandingGraph from "@/components/graph/LandingGraph";

export const metadata: Metadata = {
  title: "Jingled — What did your life sound like?",
};

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-replay-bg">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-replay-accent/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-replay-border bg-replay-card px-3 py-1 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-replay-accent animate-pulse" />
            <span className="text-[11px] text-replay-text-muted tracking-wide">
              GitHub for your music life
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-replay-text-primary leading-[1.1] mb-6">
            What did your life
            <br />
            <span className="text-gradient-green">sound like?</span>
          </h1>

          <p className="text-lg text-replay-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            Jingled transforms your Spotify listening history into a beautiful
            public profile. Every day, visualized as the album that owned it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/api/auth/login"
              className="inline-flex items-center gap-2.5 rounded-full bg-replay-accent px-6 py-3 text-sm font-semibold text-black hover:bg-replay-accent/90 transition-all glow-green"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Connect Spotify
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-full border border-replay-border bg-replay-card px-6 py-3 text-sm text-replay-text-secondary hover:text-replay-text-primary hover:border-replay-text-muted transition-all"
            >
              View demo profile
            </Link>
          </div>
        </div>
      </section>

      {/* Live preview graph */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-replay-border bg-replay-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-replay-text-muted mb-0.5">Elon Musk</p>
                <p className="text-sm font-semibold text-replay-text-primary">@elon-musk</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-replay-accent animate-pulse" />
                <span className="text-xs text-replay-text-muted">Live Preview</span>
              </div>
            </div>
            <LandingGraph />
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl grid sm:grid-cols-3 gap-4">
          <FeatureCard
            emoji="📅"
            title="Music calendar"
            description="Every day of your year, visualized by the album that dominated it. Like GitHub, but for your listening life."
          />
          <FeatureCard
            emoji="🎭"
            title="Eras detected"
            description="Jingled finds patterns in your history and names your listening phases — the Blonde era, the gym arc, the 3 AM spiral."
          />
          <FeatureCard
            emoji="🔗"
            title="Public profile"
            description="Get your own URL. Share it. Let people see what your year sounded like. This is your music identity."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-replay-text-primary mb-3">
            How it works
          </h2>
          <p className="text-sm text-replay-text-muted mb-12">Three steps. No setup.</p>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Connect Spotify", desc: "OAuth login. No passwords stored. Read-only access." },
              { n: "02", title: "Sync history", desc: "We pull your recent plays and build your graph over time." },
              { n: "03", title: "Share it", desc: "Your public profile is ready. Send it to anyone." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="text-left">
                <p className="text-[10px] font-mono text-replay-text-muted mb-2">{n}</p>
                <p className="text-sm font-semibold text-replay-text-primary mb-1">{title}</p>
                <p className="text-xs text-replay-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-2xl font-bold text-replay-text-primary mb-4">
            What did{" "}
            <span className="text-gradient-green">your year</span> sound like?
          </p>
          <p className="text-sm text-replay-text-muted mb-8">
            Connect Spotify and find out.
          </p>
          <Link
            href="/api/auth/login"
            className="inline-flex items-center gap-2.5 rounded-full bg-replay-accent px-8 py-3.5 text-sm font-semibold text-black hover:bg-replay-accent/90 transition-all glow-green-strong"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Start your Jingled
          </Link>
        </div>
      </section>

      <footer className="border-t border-replay-border px-6 py-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-replay-accent flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-black stroke-[2.2]" aria-hidden>
                <path
                  d="M14 5v10.5a2.5 2.5 0 1 1-1-2V7.2l6-1.7v8a2.5 2.5 0 1 1-1-2V4z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xs text-replay-text-muted">Jingled</span>
          </div>
          <p className="text-[11px] text-replay-text-muted">
            Not affiliated with Spotify AB
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-replay-border bg-replay-card p-5 hover:border-replay-hover transition-colors">
      <div className="text-2xl mb-3">{emoji}</div>
      <h3 className="text-sm font-semibold text-replay-text-primary mb-2">{title}</h3>
      <p className="text-xs text-replay-text-muted leading-relaxed">{description}</p>
    </div>
  );
}
