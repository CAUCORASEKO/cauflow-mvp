import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#07090f",
        foreground: "#f4f7fb",
        muted: "#8b98b5",
        border: "rgba(148, 163, 184, 0.16)",
        panel: "rgba(10, 14, 24, 0.82)",
        accent: {
          DEFAULT: "#93c5fd",
          soft: "#1d4ed8"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px rgba(8, 15, 40, 0.45)",
        float: "0 30px 80px rgba(2, 8, 23, 0.45)"
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 36%), radial-gradient(circle at 20% 20%, rgba(139,92,246,0.12), transparent 22%), radial-gradient(circle at 80% 0%, rgba(34,197,94,0.08), transparent 18%)"
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["'Manrope'", "sans-serif"]
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        pulseLine: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulseLine: "pulseLine 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
