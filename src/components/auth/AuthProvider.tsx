"use client";

// src/components/auth/AuthProvider.tsx
// Initializes Supabase session on mount and syncs to global store

import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useConversationStore } from "@/lib/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const resetConversations = useConversationStore((s) => s.reset);

  // Tracks the previously-seen user id so we only wipe conversation state
  // on an actual identity change (sign-out -> null, or login as a
  // *different* user) — not on every token refresh for the same user.
  const previousUserId = useRef<string | null | undefined>(undefined);

  const handleSession = (session: Session | null) => {
    const nextUserId = session?.user?.id ?? null;

    if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) {
      resetConversations();
    }
    previousUserId.current = nextUserId;

    setUser(session?.user ?? null, session?.access_token ?? null);
  };

  useEffect(() => {
    // Bootstrap: get the current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  return <>{children}</>;
}
