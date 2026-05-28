import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0b",
          subtle: "#111113",
          card: "#16161a"
        },
        border: {
          DEFAULT: "#26262b"
        },
        fg: {
          DEFAULT: "#f5f5f7",
          muted: "#9b9ba3",
          subtle: "#6b6b75"
        },
        accent: {
          DEFAULT: "#7c5cff",
          hover: "#8b6dff"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
