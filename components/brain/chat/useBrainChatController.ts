"use client";

import { useEffect, useRef, useState } from "react";
import type { UIEvent } from "react";
import type { BrainChatMessage, BrainChatRequest, BrainChatResponse, BrainChatSongCard } from "@/types";
import type { StoredConversation } from "@/components/brain/chat/ChatHistory";

const DEFAULT_ASSISTANT_MESSAGE =
  "Ask about your listening signals, mood trend, or song suggestions. This assistant is experimental and not medical advice.";

const NEW_CHAT_MESSAGE =
  "New chat started. I can manage playlists, search tracks, and suggest songs from your brain signal.";

interface UseBrainChatControllerInput {
  mode: "recent" | "daily" | "cluster";
  selectedDate?: string;
  selectedCluster?: string;
}

export function useBrainChatController({ mode, selectedDate, selectedCluster }: UseBrainChatControllerInput) {
  const [messages, setMessages] = useState<BrainChatMessage[]>([
    {
      role: "assistant",
      content: DEFAULT_ASSISTANT_MESSAGE,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastTools, setLastTools] = useState<string[]>([]);
  const [songCards, setSongCards] = useState<BrainChatSongCard[]>([]);
  const [history, setHistory] = useState<StoredConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("live");
  const [quickAddBusyId, setQuickAddBusyId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [trimmedContextCount, setTrimmedContextCount] = useState(0);
  const [recommendationMode, setRecommendationMode] = useState<"discovery" | "familiar">("discovery");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  function forceScrollToBottom() {
    shouldAutoScrollRef.current = true;
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }

  const validSongCards = songCards.filter(
    (card) =>
      typeof card.trackId === "string" &&
      card.trackId.trim().length > 0 &&
      typeof card.spotifyUrl === "string" &&
      card.spotifyUrl.startsWith("http")
  );
  const canSend = input.trim().length > 0 && !loading;
  const sortedHistory = [...history].sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await fetch("/api/brain/chat/history");
        if (!res.ok) {
          throw new Error("Unable to load chat history.");
        }
        const data = (await res.json()) as { conversations?: StoredConversation[] };
        if (!cancelled && Array.isArray(data.conversations)) {
          setHistory(data.conversations);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(error instanceof Error ? error.message : "Unable to load chat history.");
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (!shouldAutoScrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, songCards]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    const nextHeight = Math.min(node.scrollHeight, 160);
    node.style.height = `${nextHeight}px`;
  }, [input]);

  function buildTitle(chatMessages: BrainChatMessage[]): string {
    const firstUserMessage = chatMessages.find((message) => message.role === "user")?.content ?? "Brain chat";
    return firstUserMessage.slice(0, 38);
  }

  function persistConversation(nextMessages: BrainChatMessage[], nextCards: BrainChatSongCard[]) {
    const conversation: StoredConversation = {
      id: activeConversationId === "live" ? `conv-${Date.now()}` : activeConversationId,
      title: buildTitle(nextMessages),
      updatedAt: Date.now(),
      messages: nextMessages,
      songCards: nextCards,
    };
    setActiveConversationId(conversation.id);
    setHistory((prev) => [conversation, ...prev.filter((c) => c.id !== conversation.id)].slice(0, 12));
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const res = await fetch("/api/brain/chat/history", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(conversation),
        });
        if (!res.ok) {
          throw new Error("Failed to sync chat history.");
        }
        setSaveError(null);
      })
      .catch((error) => {
        setSaveError(error instanceof Error ? error.message : "Failed to sync chat history.");
      });
  }

  async function quickAddToPlaylist(trackId: string) {
    setQuickAddBusyId(trackId);
    try {
      const res = await fetch("/api/spotify/playlists/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      const data = (await res.json()) as { playlistName?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to add song");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Added to playlist: ${data.playlistName ?? "Jingled Quick Picks"}.`,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? `Add failed: ${error.message}` : "Could not add this track.",
        },
      ]);
    } finally {
      setQuickAddBusyId(null);
    }
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const nextMessages: BrainChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setLastTools([]);
    forceScrollToBottom();

    try {
      const contextMessages = nextMessages.slice(-20);
      setTrimmedContextCount(Math.max(0, nextMessages.length - contextMessages.length));
      const avoidTrackIds = validSongCards.map((card) => card.trackId);
      const payload: BrainChatRequest = {
        messages: contextMessages,
        mode,
        selectedDate,
        selectedCluster,
        recommendationMode,
        avoidTrackIds,
        diversitySeed: Date.now(),
      };
      const res = await fetch("/api/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as BrainChatResponse | { error?: string };
      if (!res.ok || !("reply" in data)) {
        throw new Error("error" in data ? data.error || "Request failed" : "Request failed");
      }

      const next: BrainChatMessage[] = [...nextMessages, { role: "assistant", content: data.reply }];
      const nextCards = data.songCards ?? [];
      const cardsToKeep = nextCards.length > 0 ? nextCards : validSongCards;
      setMessages(next);
      setLastTools((data.toolEvents ?? []).map((t) => t.summary));
      setSongCards(cardsToKeep);
      persistConversation(next, cardsToKeep);
    } catch (error) {
      const next = [
        ...nextMessages,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Assistant error: ${error.message}`
              : "Assistant is unavailable right now. Please try again.",
        },
      ] as BrainChatMessage[];
      setMessages(next);
      setSongCards([]);
      persistConversation(next, []);
    } finally {
      setLoading(false);
    }
  }

  async function refreshRecommendations() {
    if (loading) return;
    setLoading(true);
    setLastTools([]);
    forceScrollToBottom();
    try {
      const contextMessages = messages.slice(-20);
      const avoidTrackIds = validSongCards.map((card) => card.trackId);
      const refreshPrompt: BrainChatMessage = {
        role: "user",
        content:
          "Refresh recommendations for my current state. Return 5 tracks and prioritize alternatives not already shown.",
      };
      const requestMessages: BrainChatMessage[] = [
        ...contextMessages,
        refreshPrompt,
      ].slice(-20);
      const payload: BrainChatRequest = {
        messages: requestMessages,
        mode,
        selectedDate,
        selectedCluster,
        recommendationMode,
        avoidTrackIds,
        diversitySeed: Date.now(),
      };
      const res = await fetch("/api/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as BrainChatResponse | { error?: string };
      if (!res.ok || !("reply" in data)) {
        throw new Error("error" in data ? data.error || "Request failed" : "Request failed");
      }

      const nextCards = data.songCards ?? [];
      const cardsToKeep = nextCards.length > 0 ? nextCards : validSongCards;
      const next: BrainChatMessage[] = [...messages, { role: "assistant", content: data.reply }];
      setMessages(next);
      setLastTools((data.toolEvents ?? []).map((t) => t.summary));
      setSongCards(cardsToKeep);
      persistConversation(next, cardsToKeep);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Refresh failed: ${error.message}`
              : "Could not refresh recommendations right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteActiveConversation() {
    const targetId = activeConversationId === "live" ? sortedHistory[0]?.id : activeConversationId;
    if (!targetId) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/brain/chat/history?id=${encodeURIComponent(targetId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Delete failed");
      }
      setHistory((prev) => prev.filter((conversation) => conversation.id !== targetId));
      setActiveConversationId("live");
      setMessages([{ role: "assistant", content: "Chat deleted. " + NEW_CHAT_MESSAGE }]);
      setSongCards([]);
      setShowDeleteModal(false);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? `Delete failed: ${error.message}` : "Delete failed.",
        },
      ]);
    } finally {
      setDeleteBusy(false);
    }
  }

  function selectConversation(value: string) {
    if (value === "live") {
      setActiveConversationId("live");
      return;
    }
    const selected = history.find((h) => h.id === value);
    if (!selected) return;
    setActiveConversationId(selected.id);
    setMessages(selected.messages);
    setSongCards(selected.songCards);
  }

  function startNewChat() {
    setActiveConversationId("live");
    setMessages([{ role: "assistant", content: NEW_CHAT_MESSAGE }]);
    setSongCards([]);
  }

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 64;
  }

  return {
    messages,
    input,
    loading,
    lastTools,
    activeConversationId,
    quickAddBusyId,
    deleteBusy,
    showDeleteModal,
    historyLoading,
    historyError,
    saveError,
    trimmedContextCount,
    recommendationMode,
    scrollRef,
    textareaRef,
    validSongCards,
    canSend,
    sortedHistory,
    setInput,
    setRecommendationMode,
    setShowDeleteModal,
    sendMessage,
    refreshRecommendations,
    quickAddToPlaylist,
    deleteActiveConversation,
    selectConversation,
    startNewChat,
    handleScroll,
  };
}
