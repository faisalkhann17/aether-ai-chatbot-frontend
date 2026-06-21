"use client";

// src/components/chat/ModelSelector.tsx
//
// DeepSeek / Qwen / Gemma stay as fixed, always-present quick picks (the
// assignment's required minimum, and they resolve server-side to whichever
// live model currently backs that family — see ModelCatalogService).
// Below them is a second, separately-fetched section listing every other
// free model currently live on OpenRouter, from GET /api/chat/models.

import { useState, useEffect } from "react";
import { ChevronDown, Zap, Loader2, Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { modelsAPI, type Model } from "@/lib/api";

const FIXED_MODELS: { alias: string; label: string; description: string; color: string }[] = [
  { alias: "deepseek", label: "DeepSeek", description: "DeepSeek Chat V3", color: "#3b82f6" },
  { alias: "qwen", label: "Qwen", description: "Qwen3 235B", color: "#8b5cf6" },
  { alias: "gemma", label: "Gemma", description: "Gemma 3 27B", color: "#10b981" },
];
const FIXED_ALIASES = new Set(FIXED_MODELS.map((m) => m.alias));
const EXTRA_COLOR = "#94a3b8";

function contextLabel(n: number | null): string | null {
  if (!n) return null;
  return n >= 1000 ? `${Math.round(n / 1000)}K context` : `${n} context`;
}

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const token = useAuthStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const [extraModels, setExtraModels] = useState<Model[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  // Fetch the live catalog once and keep only what ISN'T deepseek/qwen/gemma
  // — those three already have their own fixed entries above, so this
  // section is purely "everything else that's currently free."
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    modelsAPI
      .list(token)
      .then((res) => {
        if (cancelled) return;
        const fetched = res.data?.models ?? [];
        setExtraModels(fetched.filter((m) => !m.family || !FIXED_ALIASES.has(m.family)));
      })
      .catch(() => {
        /* non-fatal — the "more free models" section just stays empty */
      })
      .finally(() => {
        if (!cancelled) setLoadingExtra(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const fixedMatch = FIXED_MODELS.find((m) => m.alias === value);
  const extraMatch = extraModels.find((m) => m.model_id === value);
  const currentLabel = fixedMatch?.label ?? extraMatch?.display_name ?? FIXED_MODELS[0].label;
  const currentColor = fixedMatch?.color ?? (extraMatch ? EXTRA_COLOR : FIXED_MODELS[0].color);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1.5 bg-surface-overlay hover:bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Zap className="w-3 h-3" style={{ color: currentColor }} />
        <span>{currentLabel}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-surface-raised border border-white/10 rounded-xl shadow-xl z-50 w-[220px] max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto py-1 animate-fade-in">
          {/* Fixed quick picks — unchanged behavior/labels */}
          {FIXED_MODELS.map((m) => (
            <button
              key={m.alias}
              onClick={() => { onChange(m.alias); setOpen(false); }}
              className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-surface-overlay transition-colors ${
                value === m.alias ? "text-ink-primary" : "text-ink-secondary"
              }`}
            >
              <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: m.color }} />
              <div>
                <div className="text-xs font-medium">{m.label}</div>
                <div className="text-[10px] text-ink-muted">{m.description}</div>
              </div>
              {value === m.alias && (
                <div className="ml-auto mt-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          ))}

          {/* Separate, live-fetched section */}
          <div className="px-3 pt-2 pb-1 mt-1 border-t border-white/6 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-ink-muted" />
            <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">
              More free models
            </span>
            {loadingExtra && <Loader2 className="w-3 h-3 animate-spin text-ink-muted ml-auto" />}
          </div>

          {!loadingExtra && extraModels.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-ink-muted">No other free models found right now</div>
          )}

          {extraModels.map((m) => (
            <button
              key={m.model_id}
              onClick={() => { onChange(m.model_id); setOpen(false); }}
              className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-surface-overlay transition-colors ${
                value === m.model_id ? "text-ink-primary" : "text-ink-secondary"
              }`}
            >
              <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: EXTRA_COLOR }} />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{m.display_name}</div>
                {contextLabel(m.context_length) && (
                  <div className="text-[10px] text-ink-muted">{contextLabel(m.context_length)}</div>
                )}
              </div>
              {value === m.model_id && (
                <div className="ml-auto mt-0.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}