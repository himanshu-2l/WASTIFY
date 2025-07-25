import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        eco: {
          green: "#19B85C",
          blue: "#0693E3",
          purple: "#8940FF",
          pink: "#FF4DB8",
          yellow: "#F7C948",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 0 0 rgba(25, 184, 92, 0)",
            transform: "scale(1)"
          },
          "50%": { 
            boxShadow: "0 0 20px 5px rgba(25, 184, 92, 0.4)",
            transform: "scale(1.02)"
          }
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite"
      },
      boxShadow: {
        'eco': '0 4px 14px 0 rgba(25, 184, 92, 0.3)',
        'eco-lg': '0 10px 25px -5px rgba(25, 184, 92, 0.4)',
        'blue': '0 4px 14px 0 rgba(6, 147, 227, 0.3)',
        'purple': '0 4px 14px 0 rgba(137, 64, 255, 0.3)',
      },
      backgroundImage: {
        'eco-gradient': 'linear-gradient(to right, #19B85C, #0693E3)',
        'purple-gradient': 'linear-gradient(to right, #8940FF, #FF4DB8)',
        'multi-gradient': 'linear-gradient(-45deg, #19B85C, #0693E3, #8940FF, #FF4DB8)',
        'card-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(240, 240, 255, 0) 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config