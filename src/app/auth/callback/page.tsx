"use client";

// src/app/auth/callback/page.tsx — Handles OAuth redirect and email links

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/chat");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-ink-secondary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <p className="text-sm">Completing sign in…</p>
      </div>
    </div>
  );
}
