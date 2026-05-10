/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0d1117",
        card: "#161b22",
        cardBorder: "#30363d",
        primary: "#4f98a3",
        primaryLight: "#7ec8c8",
        textPrimary: "#e6edf3",
        textMuted: "#8b949e",
        diffAdd: "#1a4023",
        diffRemove: "#4a1a1a",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
}
