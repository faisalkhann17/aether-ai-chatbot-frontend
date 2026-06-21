"use client";

// src/components/chat/MessageBubble.tsx

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/lib/api";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-accent">AI</span>
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? "order-first" : ""}`}>
        <div
          className={
            isUser
              ? "bg-accent/20 border border-accent/20 text-ink-primary rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
              : "bg-surface-raised border border-white/6 text-ink-primary rounded-2xl rounded-tl-sm px-4 py-2.5"
          }
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className ?? "");
                    const lang = match?.[1] ?? "";
                    const code = String(children).replace(/\n$/, "");
                    if (!inline && lang) {
                      return <CodeBlock code={code} language={lang} />;
                    }
                    return <code className={className} {...props}>{children}</code>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <StreamingCursor />}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-surface-overlay border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-ink-secondary">You</span>
        </div>
      )}
    </div>
  );
}

function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-white/8">
      <div className="flex items-center justify-between bg-surface-overlay px-3 py-1.5 border-b border-white/8">
        <span className="text-[10px] text-ink-muted font-mono uppercase tracking-wide">{language}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink-secondary transition-colors"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-accent" /> Copied</>
          ) : (
            <><Copy className="w-3 h-3" /> Copy</>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        customStyle={{ margin: 0, borderRadius: 0, background: "#161b27", fontSize: "12px" }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-bold text-accent">AI</span>
      </div>
      <div className="bg-surface-raised border border-white/6 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
