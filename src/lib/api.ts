// src/lib/api.ts — Typed API client for the FastAPI backend

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model_name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface Model {
  alias: string;
  model_id: string;
  display_name: string;
  family: "deepseek" | "qwen" | "gemma" | null;
  context_length: number | null;
}

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<APIResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    // Authenticated, user-specific responses must never be served from the
    // browser's HTTP cache. Without this, a GET to a fixed URL (e.g.
    // /api/conversations?page=1&page_size=50) could be reused across
    // different logged-in users since the URL alone is identical.
    cache: "no-store",
  });

  const body = await response.json();

  if (!response.ok && !body.success) {
    throw new Error(body.message ?? `HTTP ${response.status}`);
  }

  return body;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export const authAPI = {
  // Best-effort server-side session invalidation. The Supabase client SDK
  // already clears the local session; this additionally revokes it
  // server-side via the backend's /api/auth/logout endpoint.
  logout: (token: string) => request<null>("/api/auth/logout", { method: "POST" }, token),
};

// ── Conversations ──────────────────────────────────────────────────────────────

export const conversationsAPI = {
  list: (token: string, page = 1, pageSize = 30) =>
    request<PaginatedResponse<Conversation>>(
      `/api/conversations?page=${page}&page_size=${pageSize}`,
      {},
      token
    ),

  get: (token: string, id: string) =>
    request<ConversationDetail>(`/api/conversations/${id}`, {}, token),

  create: (token: string, model_name: string) =>
    request<Conversation>(
      "/api/conversations",
      { method: "POST", body: JSON.stringify({ title: "New Conversation", model_name }) },
      token
    ),

  rename: (token: string, id: string, title: string) =>
    request<Conversation>(
      `/api/conversations/${id}`,
      { method: "PUT", body: JSON.stringify({ title }) },
      token
    ),

  updateModel: (token: string, id: string, model_name: string) =>
    request<Conversation>(
      `/api/conversations/${id}`,
      { method: "PUT", body: JSON.stringify({ model_name }) },
      token
    ),

  delete: (token: string, id: string) =>
    request(`/api/conversations/${id}`, { method: "DELETE" }, token),

  search: (token: string, q: string, page = 1) =>
    request<PaginatedResponse<Conversation>>(
      `/api/conversations/search?q=${encodeURIComponent(q)}&page=${page}`,
      {},
      token
    ),
};

// ── Models ─────────────────────────────────────────────────────────────────────

export const modelsAPI = {
  list: (token: string) =>
    request<{ models: Model[]; default: string }>("/api/chat/models", {}, token),
};

// ── SSE Streaming ──────────────────────────────────────────────────────────────

export interface StreamCallbacks {
  onStart?: (data: { conversation_id: string; model: string; user_message_id: string }) => void;
  onToken: (token: string) => void;
  onDone?: (data: { assistant_message_id: string; conversation_id: string }) => void;
  onError?: (message: string) => void;
  onModeration?: (message: string) => void;
}

export async function streamChat(
  token: string,
  conversationId: string,
  message: string,
  model: string | null,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
      model,
    }),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Stream request failed" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const raw = line.slice(5).trim();
        try {
          const data = JSON.parse(raw);
          switch (currentEvent) {
            case "start":
              callbacks.onStart?.(data);
              break;
            case "token":
              callbacks.onToken(data.token ?? "");
              break;
            case "done":
              callbacks.onDone?.(data);
              break;
            case "error":
              callbacks.onError?.(data.message ?? "Unknown error");
              return;
            case "moderation":
              callbacks.onModeration?.(data.message ?? "Content policy violation");
              return;
          }
        } catch {
          // Malformed SSE line — skip silently
        }
        currentEvent = "";
      }
    }
  }
}