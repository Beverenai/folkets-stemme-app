import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'sans-serif'],
      },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        vote: {
          for: "hsl(var(--vote-for))",
          "for-foreground": "hsl(var(--vote-for-foreground))",
          mot: "hsl(var(--vote-mot))",
          "mot-foreground": "hsl(var(--vote-mot-foreground))",
          avholdende: "hsl(var(--vote-avholdende))",
          "avholdende-foreground": "hsl(var(--vote-avholdende-foreground))",
        },
        ios: {
          blue: "hsl(var(--ios-blue))",
          green: "hsl(var(--ios-green))",
          red: "hsl(var(--ios-red))",
          orange: "hsl(var(--ios-orange))",
          yellow: "hsl(var(--ios-yellow))",
          purple: "hsl(var(--ios-purple))",
          pink: "hsl(var(--ios-pink))",
          teal: "hsl(var(--ios-teal))",
          cyan: "hsl(var(--ios-cyan))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
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
        "ios-spring": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "ios-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "ios-slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "ios-bounce": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width, 100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsla(174, 72%, 56%, 0.3)" },
          "50%": { boxShadow: "0 0 40px hsla(174, 72%, 56%, 0.5)" },
        },
        "vote-success": {
          "0%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.15)" },
          "50%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ios-spring": "ios-spring 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "ios-fade": "ios-fade 0.3s ease-out",
        "ios-slide-up": "ios-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "ios-bounce": "ios-bounce 0.4s ease-out",
        "progress-fill": "progress-fill 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "vote-success": "vote-success 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;