import type { Config } from "tailwindcss";

// Paleta "ferramenta financeira séria" — dark only.
// Verde = positivo / em dia / ação primária.  Vermelho/laranja = SOMENTE alerta.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // superfícies
        base: "#0a0e0d",       // fundo da aplicação
        panel: "#111917",      // cards / painéis
        "panel-2": "#161f1c",  // linhas alternadas / hover
        border: "#20302b",     // divisórias
        "border-soft": "#1a2622",
        // texto
        ink: "#e8efec",        // texto primário
        muted: "#8ba39a",      // texto secundário
        faint: "#5b6f68",      // rótulos / placeholders
        // verde (destaque principal, positivo)
        brand: {
          DEFAULT: "#22c55e",
          hover: "#1eb454",
          soft: "#0e2a1c",     // fundo de badge verde
          text: "#5fe08f",
        },
        // alertas — reservados
        danger: { DEFAULT: "#f0453f", soft: "#2c1210", text: "#ff8b86" },
        warn: { DEFAULT: "#f59e0b", soft: "#2a1e08", text: "#fbbf5a" },
        info: { DEFAULT: "#38bdf8", soft: "#0b2432", text: "#7dd3fc" },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: { xl: "0.75rem" },
    },
  },
  plugins: [],
};

export default config;
