/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system palette — deep slate + emerald accent
        surface: {
          DEFAULT: "#0f1117",  // page background
          raised: "#161b27",   // sidebar, cards
          overlay: "#1e2535",  // hover states, inputs
        },
        accent: {
          DEFAULT: "#10b981",  // emerald-500
          hover: "#059669",    // emerald-600
          muted: "#064e3b",    // emerald-900
          glow: "rgba(16,185,129,0.15)",
        },
        ink: {
          primary: "#f1f5f9",  // near-white
          secondary: "#94a3b8",// slate-400
          muted: "#475569",    // slate-600
        },
        danger: "#ef4444",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in-left": "slideInLeft 0.25s ease-out",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
        "typing": "typing 1.2s steps(3) infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0, transform: "translateY(4px)" }, "100%": { opacity: 1, transform: "none" } },
        slideInLeft: { "0%": { opacity: 0, transform: "translateX(-12px)" }, "100%": { opacity: 1, transform: "none" } },
        pulseDot: { "0%, 80%, 100%": { transform: "scale(0)", opacity: 0.5 }, "40%": { transform: "scale(1)", opacity: 1 } },
      },
    },
  },
  plugins: [],
};
