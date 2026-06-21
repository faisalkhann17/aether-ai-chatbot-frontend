# Aether — AI Chatbot Frontend

The Next.js 15 frontend for **Aether**, a production-ready AI chatbot platform with real-time streaming, multiple AI models, and Supabase authentication.

> This frontend talks to a separate FastAPI backend. For the full architecture write-up, database schema, and API documentation, see the backend repo's `README.md` — this file covers the frontend specifically.

---

## Features

- **Auth** — email/password signup with verification, login, Google OAuth, forgot/reset password, protected routes — all via the Supabase client SDK
- **Chat UI** — distinct user/assistant bubbles, full Markdown + syntax-highlighted code blocks in assistant replies
- **Live streaming** — token-by-token rendering over SSE, no "flash in" of the full response
- **Model switching** — pick between DeepSeek, Qwen, and Gemma per conversation
- **Sidebar** — conversation history, debounced search (title **and** message content via the backend), new chat, inline rename, delete
- **Responsive** — sidebar becomes a slide-over overlay with a backdrop on mobile (`<768px`); a header hamburger button reopens it
- **Clear loading/error states** — network failures, moderation rejections, and model timeouts each render a distinct message

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 15 (App Router) | React framework |
| React 18 | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| `@supabase/ssr` | Browser auth session management |
| Zustand | Global state (auth + conversations) |
| `react-markdown` + `react-syntax-highlighter` | Assistant message rendering |
| Framer Motion | Animations |
| Lucide React | Icons |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout — self-hosts Inter + JetBrains Mono via next/font
│   ├── page.tsx                 # Redirect → /chat
│   ├── globals.css              # Tailwind + design tokens
│   ├── login/page.tsx           # Login / signup / forgot-password
│   ├── chat/page.tsx            # Protected chat page (redirects if unauthenticated)
│   ├── auth/callback/page.tsx   # OAuth redirect handler
│   └── reset-password/page.tsx  # Completes the password-recovery flow
├── components/
│   ├── auth/AuthProvider.tsx    # Bootstraps the Supabase session on load
│   ├── chat/
│   │   ├── ChatWindow.tsx       # Orchestrates streaming, model selection, mobile menu
│   │   ├── ChatInput.tsx        # Composer with send/stop
│   │   ├── MessageBubble.tsx    # Markdown + code-block rendering
│   │   └── ModelSelector.tsx    # DeepSeek / Qwen / Gemma dropdown
│   └── layout/Sidebar.tsx       # History, server-backed search, mobile overlay
└── lib/
    ├── api.ts                   # Typed REST client + SSE stream parser
    ├── store.ts                 # Zustand stores (auth, conversations)
    └── supabase.ts              # Supabase browser client factory
```

---

## Local Development

### Prerequisites
- Node.js 20+
- A running backend (see the backend repo) or its deployed Render URL
- A Supabase project (same one the backend uses)

### Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with real values
npm run dev
```

App runs at `http://localhost:3000`.

### Environment Variables

See `.env.example` for the full, commented list. Summary:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

All three are `NEXT_PUBLIC_*` because they're consumed by the browser. None are secret in the sense of needing to stay server-only, but they're still project-specific and shouldn't be committed — `.env.local` is git-ignored.

### Useful scripts

```bash
npm run dev          # local dev server
npm run build         # production build
npm run start         # serve the production build
npx tsc --noEmit      # type-check only
```

---

## Deployment → Vercel

1. Push this repo to GitHub.
2. Import it on [vercel.com](https://vercel.com) — Next.js is auto-detected, no build command changes needed.
3. Under **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` → your deployed Render backend URL (e.g. `https://aether-backend.onrender.com`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. In Supabase → **Authentication → URL Configuration**, set:
   - **Site URL**: your Vercel URL
   - **Redirect URLs**: `https://your-app.vercel.app/auth/callback`, `https://your-app.vercel.app/reset-password`

A GitHub Actions workflow (`.github/workflows/ci.yml`) type-checks and builds the app on every push/PR.

---

## Design Notes

**Why Supabase's client SDK directly for auth, rather than proxying through the backend?**
Supabase Auth is designed to be called from the browser — it handles OAuth redirects, email verification links, and session refresh natively. The frontend talks to Supabase directly for all auth flows, then sends the resulting JWT to the FastAPI backend on every API call; the backend independently verifies that JWT's signature. This avoids the backend needing to proxy session cookies and keeps it fully stateless.

**Why a mobile overlay sidebar instead of always-visible?**
At narrow viewports a permanently docked 256px sidebar would push the chat into an unusably narrow column. Below the `md` breakpoint the sidebar instead renders as a backdrop + slide-over panel triggered by a header hamburger button, matching the pattern used by most chat apps.
