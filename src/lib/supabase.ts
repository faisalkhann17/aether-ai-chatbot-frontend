// src/lib/supabase.ts — Supabase client factory for the browser

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
  );
}

// Singleton browser client — safe to call multiple times
export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey);

export const supabase = createClient();
