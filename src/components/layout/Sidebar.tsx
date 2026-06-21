"use client";

// src/components/layout/Sidebar.tsx

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Plus, Search, Trash2, Pencil, Check, X,
  LogOut, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore, useConversationStore } from "@/lib/store";
import { conversationsAPI, type Conversation } from "@/lib/api";

interface SidebarProps {
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
}

const MOBILE_BREAKPOINT = 768; // matches Tailwind's `md` breakpoint
const SEARCH_DEBOUNCE_MS = 350;

export function Sidebar({ onNewChat, onSelectConversation }: SidebarProps) {
  const router = useRouter();
  const { token, user, signOut } = useAuthStore();
  const {
    conversations, activeConversation, searchQuery,
    sidebarOpen, setSidebarOpen, setSearchQuery,
    updateConversation, removeConversation,
  } = useConversationStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Server-side search results (by title AND message content).
  // When the search box is empty, we fall back to the full conversation list.
  const [searchResults, setSearchResults] = useState<Conversation[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef("");

  // Debounced server-side search across title + message content
  useEffect(() => {
    const q = searchQuery.trim();
    latestQueryRef.current = q;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    if (q.length < 2 || !token) {
      // Backend requires a minimum query length; show local matches in the
      // meantime so the box never feels unresponsive while typing.
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await conversationsAPI.search(token, q);
        // Ignore stale responses from a query that's since changed
        if (latestQueryRef.current === q) {
          setSearchResults(res.data?.items ?? []);
        }
      } catch {
        if (latestQueryRef.current === q) setSearchResults([]);
      } finally {
        if (latestQueryRef.current === q) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, token]);

  const trimmedQuery = searchQuery.trim();
  const filtered = trimmedQuery
    ? searchResults ?? conversations.filter((c) =>
        c.title.toLowerCase().includes(trimmedQuery.toLowerCase())
      )
    : conversations;

  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT) {
      setSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    onNewChat();
    closeSidebarOnMobile();
  };

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    closeSidebarOnMobile();
  };

  const handleRename = async (conv: Conversation) => {
    if (!token || !renameValue.trim()) { setRenamingId(null); return; }
    try {
      await conversationsAPI.rename(token, conv.id, renameValue.trim());
      updateConversation(conv.id, { title: renameValue.trim() });
    } catch { /* no-op */ }
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    try {
      await conversationsAPI.delete(token, id);
      removeConversation(id);
    } catch { /* no-op */ }
    setDeletingId(null);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Google OAuth populates full_name/avatar_url in user_metadata; email/password
  // signups won't have these, so we fall back gracefully at each step.
  const displayName: string =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial = displayName.charAt(0).toUpperCase();

  if (!sidebarOpen) {
    return (
      <div className="hidden md:flex flex-col items-center w-12 bg-surface-raised border-r border-white/8 py-3 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-surface-overlay transition-colors"
          title="Open sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg text-ink-secondary hover:text-accent transition-colors"
          title="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop — tapping it closes the overlay sidebar */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-72 max-w-[85vw] md:static md:z-auto md:w-64 md:min-w-[16rem] bg-surface-raised border-r border-white/8 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="text-sm font-semibold text-ink-primary">Aether</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg text-ink-secondary hover:text-accent hover:bg-surface-overlay transition-colors"
              title="New conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-surface-overlay transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search — queries title AND message content via the backend */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-overlay border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
            />
            {searching && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted animate-spin" />
            )}
          </div>
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-ink-muted text-xs">
              {searching
                ? "Searching…"
                : trimmedQuery
                ? "No matching conversations"
                : "No conversations yet"}
            </div>
          )}
          <ul className="space-y-0.5">
            {filtered.map((conv) => (
              <li key={conv.id} className="group">
                {renamingId === conv.id ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(conv);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="flex-1 bg-surface-overlay border border-accent/40 rounded px-2 py-0.5 text-xs text-ink-primary focus:outline-none"
                    />
                    <button onClick={() => handleRename(conv)} className="text-accent hover:text-accent-hover">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setRenamingId(null)} className="text-ink-muted hover:text-ink-secondary">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      activeConversation === conv.id
                        ? "bg-accent/15 text-ink-primary"
                        : "text-ink-secondary hover:bg-surface-overlay hover:text-ink-primary"
                    }`}
                    onClick={() => handleSelect(conv.id)}
                  >
                    <span className="flex-1 text-xs truncate">{conv.title}</span>
                    <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(conv.id);
                          setRenameValue(conv.title);
                        }}
                        className="p-1 rounded hover:bg-surface-overlay text-ink-muted hover:text-ink-secondary transition-colors"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conv.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/10 text-ink-muted hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        {deletingId === conv.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/6 px-3 py-2 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-primary truncate">{displayName}</p>
              {user?.email && (
                <p className="text-[11px] text-ink-muted truncate">{user.email}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-overlay transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}