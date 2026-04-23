"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSync = async () => {
    setState("syncing");
    setMessage("");

    try {
      const res = await fetch("/api/spotify/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "Sync failed");
        return;
      }

      setState("done");
      setMessage(`Synced ${data.synced} plays`);
      router.refresh();

      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setMessage("Network error");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {message && (
        <p className={`text-[10px] whitespace-nowrap ${state === "error" ? "text-red-400" : "text-replay-text-muted"}`}>
          {message}
        </p>
      )}
      <button
        onClick={handleSync}
        disabled={state === "syncing"}
        className="inline-flex items-center gap-2 rounded-full border border-replay-border bg-replay-card px-4 py-2 text-xs font-medium text-replay-text-secondary hover:text-replay-text-primary hover:border-replay-text-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === "syncing" ? (
          <>
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Syncing...
          </>
        ) : state === "done" ? (
          <>
            <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-replay-accent fill-none stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-replay-accent">Synced</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync history
          </>
        )}
      </button>
    </div>
  );
}
