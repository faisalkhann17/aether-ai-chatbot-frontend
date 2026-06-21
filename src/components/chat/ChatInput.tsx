"use client";

// src/components/chat/ChatInput.tsx

import { useState, useRef, useCallback } from "react";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder = "Message Aether…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="border-t border-white/6 bg-surface px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-surface-raised border border-white/10 rounded-2xl px-4 py-3 focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent text-sm text-ink-primary placeholder-ink-muted resize-none focus:outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: "200px" }}
          />

          <button
            onClick={isStreaming ? onStop : handleSend}
            disabled={!isStreaming && (!value.trim() || disabled)}
            className={`shrink-0 p-2 rounded-xl transition-all ${
              isStreaming
                ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                : value.trim() && !disabled
                ? "bg-accent hover:bg-accent-hover text-white"
                : "bg-surface-overlay text-ink-muted cursor-not-allowed"
            }`}
            title={isStreaming ? "Stop generation" : "Send message"}
          >
            {isStreaming ? (
              <Square className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-ink-muted mt-2">
          Shift + Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}
