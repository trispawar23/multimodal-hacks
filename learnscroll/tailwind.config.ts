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
        brand: {
          50: "#F5F0FF",
          100: "#EDE4FF",
          200: "#D9CCFF",
          400: "#B8A4E8",
          500: "#A894DC",
          600: "#9278C8",
        },
        pastel: {
          cream: "#FFF9F5",
          blush: "#FFE8EE",
          mint: "#DFF5EC",
          sky: "#E4EEFF",
          lilac: "#EDE4FF",
          lemon: "#FFF6D6",
          peach: "#FFE5D4",
          ink: "#4A4458",
          muted: "#8B839E",
        },
        surface: {
          bg: "#FFF9F5",
          card: "#FFFFFF",
          border: "#F0E8E4",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        waveform: "waveform 1.2s ease-in-out infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        waveform: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        slideUp: {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
