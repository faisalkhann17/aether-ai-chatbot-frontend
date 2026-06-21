"use client";

// src/components/chat/ChatWindow.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, ShieldAlert, MessageSquarePlus, Menu } from "lucide-react";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { useAuthStore, useConversationStore } from "@/lib/store";
import { conversationsAPI, streamChat, type Message, type ConversationDetail } from "@/lib/api";

interface ChatWindowProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  onTitleUpdated: (id: string, title: string) => void;
}

type ChatError = { type: "error" | "moderation"; message: string } | null;

export function ChatWindow({ conversationId, onConversationCreated, onTitleUpdated }: ChatWindowProps) {
  const { token } = useAuthStore();
  const { conversations, setSidebarOpen } = useConversationStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ChatError>(null);
  const [selectedModel, setSelectedModel] = useState("deepseek");

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingMsgRef = useRef<string>("");

  const activeConv = conversations.find((c) => c.id === conversationId);

  // Load conversation when ID changes
  useEffect(() => {
    if (!conversationId || !token) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    conversationsAPI
      .get(token, conversationId)
      .then((res) => {
        const detail = res.data as ConversationDetail;
        setMessages(detail.messages ?? []);
        setSelectedModel(detail.model_name ?? "deepseek");
      })
      .catch(() => setError({ type: "error", message: "Failed to load conversation." }))
      .finally(() => setLoading(false));
  }, [conversationId, token]);

  // Scroll to bottom on new messages or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    if (conversationId && token) {
      try {
        await conversationsAPI.updateModel(token, conversationId, model);
      } catch { /* non-critical */ }
    }
  };

  const handleSend = useCallback(async (userMessage: string) => {
    if (!token) return;
    setError(null);

    let activeConvId = conversationId;

    // Create conversation on first message if none exists
    if (!activeConvId) {
      try {
        const res = await conversationsAPI.create(token, selectedModel);
        activeConvId = res.data!.id;
        onConversationCreated(activeConvId);
      } catch {
        setError({ type: "error", message: "Failed to start conversation." });
        return;
      }
    }

    // Optimistically add the user message to UI
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setStreamingContent("");
    streamingMsgRef.current = "";

    // Set up abort controller for stop button
    abortRef.current = new AbortController();

    try {
      await streamChat(
        token,
        activeConvId,
        userMessage,
        selectedModel,
        {
          onToken: (token) => {
            streamingMsgRef.current += token;
            setStreamingContent(streamingMsgRef.current);
          },
          onDone: (data) => {
            // Replace temp streaming display with persisted assistant message
            const assistantMsg: Message = {
              id: data.assistant_message_id,
              conversation_id: activeConvId!,
              role: "assistant",
              content: streamingMsgRef.current,
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent(null);
            streamingMsgRef.current = "";

            // Notify parent if title updated (backend does this async)
            setTimeout(() => {
              if (token && activeConvId) {
                conversationsAPI.get(token, activeConvId).then((res) => {
                  const detail = res.data as ConversationDetail;
                  if (detail?.title) onTitleUpdated(activeConvId!, detail.title);
                }).catch(() => {});
              }
            }, 1500);
          },
          onError: (msg) => {
            setError({ type: "error", message: msg });
            setStreamingContent(null);
            // Remove the optimistic user message on error
            setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
          },
          onModeration: (msg) => {
            setError({ type: "moderation", message: msg });
            setStreamingContent(null);
            setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
          },
        },
        abortRef.current.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError({ type: "error", message: err.message ?? "Connection failed." });
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      }
      setStreamingContent(null);
    } finally {
      setIsStreaming(false);
    }
  }, [token, conversationId, selectedModel, onConversationCreated, onTitleUpdated]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    // Keep whatever was streamed so far as the assistant message
    if (streamingMsgRef.current) {
      const partial: Message = {
        id: `partial-${Date.now()}`,
        conversation_id: conversationId ?? "",
        role: "assistant",
        content: streamingMsgRef.current + " *(generation stopped)*",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, partial]);
    }
    setStreamingContent(null);
    setIsStreaming(false);
  }, [conversationId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!conversationId && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <EmptyState onSend={handleSend} isStreaming={isStreaming} selectedModel={selectedModel} onModelChange={handleModelChange} error={error} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/6 bg-surface shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 -ml-1 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-surface-overlay transition-colors shrink-0"
            title="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-medium text-ink-primary truncate max-w-xs">
            {activeConv?.title ?? "Conversation"}
          </h2>
        </div>
        <ModelSelector value={selectedModel} onChange={handleModelChange} disabled={isStreaming} />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="flex gap-1">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming assistant message — only once there's actual content;
              before the first token arrives, TypingIndicator alone covers it. */}
          {streamingContent && (
            <MessageBubble
              message={{
                id: "streaming",
                conversation_id: conversationId ?? "",
                role: "assistant",
                content: streamingContent,
                created_at: new Date().toISOString(),
              }}
              isStreaming={true}
            />
          )}

          {/* Typing indicator when waiting for first token */}
          {isStreaming && streamingContent === "" && <TypingIndicator />}

          {/* Error / moderation banner */}
          {error && (
            <div className={`flex items-start gap-3 p-3 rounded-xl border animate-fade-in ${
              error.type === "moderation"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {error.type === "moderation" ? (
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        disabled={loading}
      />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({
  onSend, isStreaming, selectedModel, onModelChange, error,
}: {
  onSend: (msg: string) => void;
  isStreaming: boolean;
  selectedModel: string;
  onModelChange: (m: string) => void;
  error: ChatError;
}) {
  const setSidebarOpen = useConversationStore((s) => s.setSidebarOpen);
  const SUGGESTIONS = [
    "Explain Server-Sent Events and how they differ from WebSockets",
    "Write a Python async generator that retries on failure",
    "Summarize the key differences between SQL and NoSQL databases",
    "What are the SOLID principles in software engineering?",
  ];

  return (
    <div className="flex-1 flex flex-col">
      <div className="md:hidden px-2 py-2">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-surface-overlay transition-colors"
          title="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-4">
          <MessageSquarePlus className="w-6 h-6 text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-ink-primary mb-1">Start a conversation</h2>
        <p className="text-sm text-ink-secondary mb-6 text-center max-w-sm">
          Ask anything — pick a model above, or go with the default.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="text-left text-xs text-ink-secondary bg-surface-raised hover:bg-surface-overlay border border-white/8 hover:border-white/14 rounded-xl px-3 py-2.5 transition-all hover:text-ink-primary"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <ModelSelector value={selectedModel} onChange={onModelChange} />
        </div>

        {/* Error / moderation banner — was previously silently dropped here,
            since this branch renders before any conversation exists. */}
        {error && (
          <div className={`flex items-start gap-3 p-3 rounded-xl border animate-fade-in w-full max-w-2xl ${
            error.type === "moderation"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {error.type === "moderation" ? (
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <p className="text-sm">{error.message}</p>
          </div>
        )}
      </div>

      <ChatInput onSend={onSend} isStreaming={isStreaming} />
    </div>
  );
}