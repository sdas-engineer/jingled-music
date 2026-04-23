"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode, RefObject, UIEvent } from "react";
import type { BrainChatMessage } from "@/types";

function normalizeMessageMarkdown(content: string) {
  return content
    .replace(/\[([^\]]+)\]\s*\n\s*\((https?:\/\/[^)]+)\)/g, "[$1]($2)")
    .replace(/\[([^\]]+)\]\s+\((https?:\/\/[^)]+)\)/g, "[$1]($2)");
}

function normalizeSpotifyUrl(url: string) {
  const embedMatch = url.match(/open\.spotify\.com\/embed\/track\/([A-Za-z0-9]+)/);
  if (embedMatch?.[1]) {
    return `https://open.spotify.com/track/${embedMatch[1]}`;
  }
  return url;
}

function renderFormattedMessage(content: string) {
  return (
    <div className="[overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="text-[13px] leading-6 text-replay-text-primary whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-[13px] leading-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-[13px] leading-6">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-replay-text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic text-replay-text-primary">{children}</em>,
          code: ({ children, className }) => (
            <code className={`rounded bg-white/10 px-1 py-0.5 text-[12px] ${className ?? ""}`}>{children}</code>
          ),
          pre: ({ children }) => <pre className="overflow-x-auto rounded bg-black/40 p-2 text-[12px]">{children}</pre>,
          a: ({ href, children }) => {
            const safeHref = href ? normalizeSpotifyUrl(href) : "";
            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline underline-offset-4 hover:text-blue-300 break-all"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {normalizeMessageMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

interface ChatMessagesProps {
  messages: BrainChatMessage[];
  loading: boolean;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  scrollRef: RefObject<HTMLDivElement>;
  children?: ReactNode;
}

export default function ChatMessages({ messages, loading, onScroll, scrollRef, children }: ChatMessagesProps) {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 min-h-0 max-w-full overflow-y-auto overflow-x-hidden space-y-5 pr-1 py-3"
    >
      {messages.map((message, idx) => (
        <div
          key={`${message.role}-${idx}`}
          className={`${message.role === "user" ? "ml-auto max-w-[88%] text-right" : "max-w-full"} min-w-0 pr-1`}
        >
          <p className="text-[10px] text-replay-text-muted mb-1">{message.role === "user" ? "You" : "Jingled AI"}</p>
          {renderFormattedMessage(message.content)}
        </div>
      ))}
      {loading && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-replay-text-muted mb-1">Jingled AI</p>
          <p className="text-[13px] leading-6 text-cyan-100">Thinking...</p>
        </div>
      )}
      {children}
    </div>
  );
}
