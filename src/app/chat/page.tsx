"use client";

// src/app/chat/page.tsx — Protected main chat page

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useConversationStore } from "@/lib/store";
import { conversationsAPI } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuthStore();
  const {
    setConversations, addConversation, updateConversation,
    activeConversation, setActive, setSidebarOpen,
  } = useConversationStore();
  const [convLoading, setConvLoading] = useState(true);

  // Default to a collapsed sidebar on mobile viewports so the chat is
  // visible immediately, rather than being covered by the overlay.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Load conversation list on mount
  useEffect(() => {
    if (!token) return;
    conversationsAPI
      .list(token, 1, 50)
      .then((res) => {
        setConversations(res.data?.items ?? []);
      })
      .catch(console.error)
      .finally(() => setConvLoading(false));
  }, [token, setConversations]);

  const handleNewChat = () => {
    setActive(null);
  };

  const handleSelectConversation = (id: string) => {
    setActive(id);
  };

  const handleConversationCreated = (id: string) => {
    setActive(id);
    // Reload list to get the new conversation with proper metadata
    if (token) {
      conversationsAPI.list(token, 1, 50).then((res) => {
        setConversations(res.data?.items ?? []);
      });
    }
  };

  const handleTitleUpdated = (id: string, title: string) => {
    updateConversation(id, { title });
  };

  // Loading states
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null; // redirect in progress

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface">
        <ChatWindow
          conversationId={activeConversation}
          onConversationCreated={handleConversationCreated}
          onTitleUpdated={handleTitleUpdated}
        />
      </main>
    </div>
  );
}
