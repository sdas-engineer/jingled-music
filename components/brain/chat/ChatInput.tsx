"use client";

import type { RefObject } from "react";

interface ChatInputProps {
  input: string;
  loading: boolean;
  canSend: boolean;
  recommendationMode: "discovery" | "familiar";
  trimmedContextCount: number;
  starterPrompts: string[];
  textareaRef: RefObject<HTMLTextAreaElement>;
  lastTools: string[];
  onInputChange: (value: string) => void;
  onSend: (value: string) => void;
  onRefreshRecommendations: () => void;
  onSetRecommendationMode: (mode: "discovery" | "familiar") => void;
}

export default function ChatInput({
  input,
  loading,
  canSend,
  recommendationMode,
  trimmedContextCount,
  starterPrompts,
  textareaRef,
  lastTools,
  onInputChange,
  onSend,
  onRefreshRecommendations,
  onSetRecommendationMode,
}: ChatInputProps) {
  return (
    <>
      {lastTools.length > 0 && (
        <div className="mt-1 mb-2 flex flex-wrap gap-2 border-t border-white/10 pt-2">
          {lastTools.map((tool, idx) => (
            <span key={`${tool}-${idx}`} className="text-[11px] text-replay-text-muted">
              {tool}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-2 border-t border-white/10">
        <div className="mb-2 flex items-center justify-between gap-2 min-w-0">
          <div className="inline-flex items-center rounded-lg border border-cyan-300/20 bg-[#0b1320] p-0.5">
            <button
              type="button"
              title="Discovery mode recommends mostly new tracks you haven't played."
              onClick={() => onSetRecommendationMode("discovery")}
              className={`px-2 py-1 text-[10px] rounded-md ${
                recommendationMode === "discovery"
                  ? "bg-white/15 text-replay-text-primary"
                  : "text-replay-text-muted"
              }`}
            >
              Discovery
            </button>
            <button
              type="button"
              title="Familiar mode recommends tracks from your known listening taste."
              onClick={() => onSetRecommendationMode("familiar")}
              className={`px-2 py-1 text-[10px] rounded-md ${
                recommendationMode === "familiar"
                  ? "bg-white/15 text-replay-text-primary"
                  : "text-replay-text-muted"
              }`}
            >
              Familiar
            </button>
          </div>
          <span className="text-[10px] text-replay-text-muted truncate" title="Controls recommendation style">
            Recommendation mode
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          <button
            type="button"
            onClick={onRefreshRecommendations}
            disabled={loading}
            className="inline-flex h-7 w-7 items-center justify-center border border-cyan-400/35 text-cyan-200 hover:text-cyan-100 disabled:opacity-50"
            title="Get a fresh set of recommendations"
            aria-label="Refresh recommendations"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M12 5a7 7 0 0 1 6.93 6h-2.02A5 5 0 0 0 8.2 8.4L10.5 10.7H5V5.2l1.78 1.78A6.96 6.96 0 0 1 12 5Zm6.22 12.02A6.96 6.96 0 0 1 12 19a7 7 0 0 1-6.93-6h2.02A5 5 0 0 0 15.8 15.6L13.5 13.3H19v5.5l-1.78-1.78Z" />
            </svg>
          </button>
          {starterPrompts.slice(0, 2).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSend(prompt)}
              disabled={loading}
              className="text-[11px] px-2 py-1 border border-white/15 text-replay-text-secondary hover:text-replay-text-primary disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="relative">
          {trimmedContextCount > 0 && (
            <p className="mb-1 text-[10px] text-replay-text-muted">
              Earlier messages not included in this request ({trimmedContextCount} trimmed).
            </p>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onInput={(e) => {
              const node = e.currentTarget;
              node.style.height = "auto";
              const nextHeight = Math.min(node.scrollHeight, 160);
              node.style.height = `${nextHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(input);
              }
            }}
            maxLength={1200}
            rows={1}
            placeholder="Ask about signal, trend, or suggestions..."
            className="w-full resize-none border border-white/15 bg-[#050911] pr-12 pl-3 pt-2 pb-3 text-[13px] text-replay-text-primary placeholder:text-replay-text-secondary outline-none focus:border-white/30 min-h-[46px] max-h-40 overflow-y-auto"
          />
          <button
            type="button"
            onClick={() => onSend(input)}
            disabled={!canSend}
            aria-label="Send message"
            className="absolute right-2 top-1.5 h-8 w-8 inline-flex items-center justify-center bg-white/10 text-replay-text-primary disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M3 20.5V14l8-2-8-2V3.5l19 8.5-19 8.5z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
