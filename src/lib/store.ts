// src/lib/store.ts — Global state management with Zustand

import { create } from "zustand";
import { supabase } from "./supabase";
import { authAPI, type Conversation } from "./api";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User | null, token: string | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,

  setUser: (user, token) => set({ user, token, loading: false }),

  signOut: async () => {
    const { token } = get();
    // Best-effort server-side session revocation — never blocks sign-out
    // on the client if the backend is briefly unreachable.
    if (token) {
      try {
        await authAPI.logout(token);
      } catch {
        /* non-fatal — proceed with client-side sign-out regardless */
      }
    }
    await supabase.auth.signOut();
    set({ user: null, token: null });
  },
}));

interface ConversationState {
  conversations: Conversation[];
  activeConversation: string | null;
  searchQuery: string;
  sidebarOpen: boolean;
  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setActive: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSidebarOpen: (open: boolean) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  activeConversation: null,
  searchQuery: "",
  sidebarOpen: true,

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) =>
    set((state) => ({ conversations: [conv, ...state.conversations] })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversation:
        state.activeConversation === id ? null : state.activeConversation,
    })),

  setActive: (id) => set({ activeConversation: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Wipes every piece of per-user state (but leaves sidebarOpen — a UI
  // preference, not session data). Called whenever the authenticated user
  // changes (sign-out -> null, or a fresh login as a *different* user),
  // so a previous session's conversations never leak into the new one.
  reset: () =>
    set({ conversations: [], activeConversation: null, searchQuery: "" }),
}));