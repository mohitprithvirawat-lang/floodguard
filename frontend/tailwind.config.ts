import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        risk: {
          normal: "#22c55e",
          watch: "#eab308",
          warning: "#f97316",
          critical: "#ef4444",
        },
        command: {
          bg: "#0b0f19",
          card: "#111827",
          border: "#1f2937",
          sidebar: "#0d1322",
          accent: "#3b82f6",
          muted: "#94a3b8"
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
};
export default config;
