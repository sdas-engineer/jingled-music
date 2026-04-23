"use client";

import type { BrainChatMessage, BrainChatSongCard } from "@/types";

export interface StoredConversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: BrainChatMessage[];
  songCards: BrainChatSongCard[];
}

interface ChatHistoryProps {
  activeConversationId: string;
  history: StoredConversation[];
  historyLoading: boolean;
  historyError: string | null;
  saveError: string | null;
  deleteBusy: boolean;
  onSelectConversation: (value: string) => void;
  onNewChat: () => void;
  onDeleteChat: () => void;
}

export default function ChatHistory({
  activeConversationId,
  history,
  historyLoading,
  historyError,
  saveError,
  deleteBusy,
  onSelectConversation,
  onNewChat,
  onDeleteChat,
}: ChatHistoryProps) {
  return (
    <div className="pb-3 border-b border-white/10">
      <p className="text-sm font-semibold text-replay-text-primary">Jingled AI Agent</p>
      <p className="text-xs text-replay-text-muted mt-0.5">Spotify actions, recommendations, and memory</p>
      {historyError && <p className="mt-1 text-[11px] text-red-300">{historyError}</p>}
      {saveError && <p className="mt-1 text-[11px] text-amber-300">{saveError}</p>}
      <div className="mt-2 flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
        <select
          value={activeConversationId}
          onChange={(e) => onSelectConversation(e.target.value)}
          className="bg-transparent border border-white/15 px-2 py-1.5 text-[12px] text-replay-text-primary outline-none min-w-0 max-w-[160px] sm:max-w-[220px]"
        >
          <option value="live">{historyLoading ? "Loading chats..." : "Current chat"}</option>
          {history.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onNewChat}
          className="text-[11px] px-2 py-1.5 border border-white/15 text-replay-text-secondary hover:text-replay-text-primary"
        >
          New chat
        </button>
        <button
          type="button"
          title={
            history.length === 0
              ? "No saved chats to delete"
              : activeConversationId === "live"
                ? "Delete most recent saved chat"
                : "Delete selected chat"
          }
          onClick={onDeleteChat}
          disabled={history.length === 0 || deleteBusy}
          className="inline-flex h-8 w-8 items-center justify-center border border-red-400/40 text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Delete selected chat history"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
            <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
