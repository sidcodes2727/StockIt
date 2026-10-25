/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      fontFamily: {
        // Geist for UI, Bricolage Grotesque for display headlines, Geist Mono
        // for every numeral, SKU and reference — tabular figures keep table
        // columns from jittering.
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Bricolage Grotesque", "Geist", "ui-sans-serif", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        // The brand's signature highlight. Decorative only — never a status.
        volt: {
          DEFAULT: "hsl(var(--volt) / <alpha-value>)",
          foreground: "hsl(var(--volt-foreground) / <alpha-value>)",
        },
        // The console rail is dark in both themes, so it has its own ramp.
        sidebar: {
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          muted: "hsl(var(--sidebar-muted) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          hover: "hsl(var(--sidebar-hover) / <alpha-value>)",
        },
        // Status colours are reserved: never reused as a generic chart series.
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 5px)",
      },
      boxShadow: {
        // Borders carry the structure; shadows only lift things that float.
        soft: "0 1px 2px 0 hsl(var(--shadow-tint) / 0.05)",
        raised:
          "0 1px 2px 0 hsl(var(--shadow-tint) / 0.06), 0 8px 24px -8px hsl(var(--shadow-tint) / 0.14)",
        overlay:
          "0 16px 48px -12px hsl(var(--shadow-tint) / 0.28), 0 4px 12px -4px hsl(var(--shadow-tint) / 0.12)",
        glow: "0 0 0 1px hsl(var(--primary) / 0.25), 0 8px 28px -6px hsl(var(--primary) / 0.45)",
        "inset-hi": "inset 0 1px 0 0 hsl(0 0% 100% / 0.18)",
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
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        indeterminate: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(300%)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "page-in": {
          from: { opacity: "0", transform: "translateY(10px)", filter: "blur(3px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "meter-breathe": {
          "0%, 100%": { transform: "scaleX(var(--from, 0.4))" },
          "50%": { transform: "scaleX(var(--to, 0.9))" },
        },
        "ping-soft": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "80%, 100%": { transform: "scale(2.4)", opacity: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "ring-draw": {
          from: { strokeDasharray: "0 var(--ring-circumference)" },
        },
        "bar-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.8s infinite",
        indeterminate: "indeterminate 1.2s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "fade-in-up": "fade-in-up 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "page-in": "page-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) backwards",
        "meter-breathe": "meter-breathe 6s ease-in-out infinite",
        "ping-soft": "ping-soft 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        marquee: "marquee 36s linear infinite",
        "ring-draw": "ring-draw 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "bar-grow": "bar-grow 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
