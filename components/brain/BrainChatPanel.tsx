"use client";

import Modal from "@/components/ui/Modal";
import ChatHistory from "@/components/brain/chat/ChatHistory";
import ChatMessages from "@/components/brain/chat/ChatMessages";
import SongCardList from "@/components/brain/chat/SongCardList";
import ChatInput from "@/components/brain/chat/ChatInput";
import { useBrainChatController } from "@/components/brain/chat/useBrainChatController";

interface BrainChatPanelProps {
  mode: "recent" | "daily" | "cluster";
  selectedDate?: string;
  selectedCluster?: string;
  drawerMode?: boolean;
}

const STARTER_PROMPTS = [
  "What does my current listening signal suggest?",
  "Recommend 5 tracks based on my current brain state.",
  "How has my mood trend changed this week?",
  "What should I play next if I want calm focus?",
];

export default function BrainChatPanel({
  mode,
  selectedDate,
  selectedCluster,
  drawerMode = false,
}: BrainChatPanelProps) {
  const controller = useBrainChatController({ mode, selectedDate, selectedCluster });

  return (
    <div
      className={`flex flex-col ${
        drawerMode
          ? "h-full w-full max-w-full overflow-x-hidden bg-transparent p-0 text-replay-text-primary"
          : "h-[360px] border border-white/10 bg-[#070b12] p-3"
      }`}
    >
      <ChatHistory
        activeConversationId={controller.activeConversationId}
        history={controller.sortedHistory}
        historyLoading={controller.historyLoading}
        historyError={controller.historyError}
        saveError={controller.saveError}
        deleteBusy={controller.deleteBusy}
        onSelectConversation={controller.selectConversation}
        onNewChat={controller.startNewChat}
        onDeleteChat={() => controller.setShowDeleteModal(true)}
      />

      <ChatMessages
        messages={controller.messages}
        loading={controller.loading}
        scrollRef={controller.scrollRef}
        onScroll={controller.handleScroll}
      >
        <SongCardList
          songCards={controller.loading ? [] : controller.validSongCards}
          quickAddBusyId={controller.quickAddBusyId}
          onQuickAdd={controller.quickAddToPlaylist}
        />
      </ChatMessages>

      <ChatInput
        input={controller.input}
        loading={controller.loading}
        canSend={controller.canSend}
        recommendationMode={controller.recommendationMode}
        trimmedContextCount={controller.trimmedContextCount}
        starterPrompts={STARTER_PROMPTS}
        textareaRef={controller.textareaRef}
        lastTools={controller.lastTools}
        onInputChange={controller.setInput}
        onSend={controller.sendMessage}
        onRefreshRecommendations={controller.refreshRecommendations}
        onSetRecommendationMode={controller.setRecommendationMode}
      />
      <Modal
        open={controller.showDeleteModal}
        onClose={() => (controller.deleteBusy ? undefined : controller.setShowDeleteModal(false))}
      >
        <div className="p-4">
          <p className="text-sm font-semibold text-replay-text-primary">Delete chat history?</p>
          <p className="mt-1 text-xs text-replay-text-muted">
            This will remove the selected conversation permanently.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => controller.setShowDeleteModal(false)}
              disabled={controller.deleteBusy}
              className="px-3 py-1.5 text-xs border border-white/15 text-replay-text-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void controller.deleteActiveConversation()}
              disabled={controller.deleteBusy}
              className="px-3 py-1.5 text-xs border border-red-400/40 text-red-300 disabled:opacity-50"
            >
              {controller.deleteBusy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
