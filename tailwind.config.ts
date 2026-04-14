import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tier colors
        tier1: {
          DEFAULT: "#22c55e",
          light: "#dcfce7",
          text: "#15803d",
        },
        tier2: {
          DEFAULT: "#eab308",
          light: "#fef9c3",
          text: "#a16207",
        },
        tier3: {
          DEFAULT: "#9ca3af",
          light: "#f3f4f6",
          text: "#4b5563",
        },
        // Status colors
        status: {
          active: "#3b82f6",
          "active-light": "#dbeafe",
          deadend: "#ef4444",
          "deadend-light": "#fee2e2",
          offer: "#f59e0b",
          "offer-light": "#fef3c7",
          neutral: "#6b7280",
          "neutral-light": "#f9fafb",
        },
        // App surface colors (Linear-like)
        surface: {
          bg: "#0f0f0f",
          card: "#1a1a1a",
          border: "#2a2a2a",
          hover: "#252525",
          input: "#1e1e1e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "slide-in": "slideIn 0.2s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
      },
      keyframes: {
        slideIn: {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
