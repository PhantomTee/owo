import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#faf6f0",
        forest: "#1a3a2a",
        gold: "#d4a853",
        charcoal: "#2a2a2a",
        moss: "#6c7a51",
        clay: "#b65f3b"
      },
      fontFamily: {
        heading: ["Fraunces", "Georgia", "serif"],
        sans: ["DM Sans", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(26, 58, 42, 0.12)"
      }
    }
  },
  plugins: []
}

export default config
