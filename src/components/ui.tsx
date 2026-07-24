"use client";

import { ReactNode, useEffect } from "react";

/* ---------------- Badges de status ---------------- */

type Tone = "brand" | "danger" | "warn" | "info" | "muted";
const toneCls: Record<Tone, string> = {
  brand: "bg-brand/12 text-brand-text ring-brand/25",
  danger: "bg-danger/12 text-danger-text ring-danger/25",
  warn: "bg-warn/12 text-warn-text ring-warn/25",
  info: "bg-info/12 text-info-text ring-info/25",
  muted: "bg-white/5 text-muted ring-white/10",
};

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ring-1 ${toneCls[tone]}`}
    >
      {children}
    </span>
  );
}

const parcelaTone: Record<string, Tone> = {
  pago: "brand",
  a_vencer: "info",
  vencido: "danger",
  cancelado: "muted",
};
const parcelaLabel: Record<string, string> = {
  pago: "Pago",
  a_vencer: "A vencer",
  vencido: "Vencido",
  cancelado: "Cancelado",
};
export function ParcelaBadge({ status }: { status: string }) {
  return <Badge tone={parcelaTone[status] ?? "muted"}>{parcelaLabel[status] ?? status}</Badge>;
}

const contratoTone: Record<string, Tone> = {
  ativo: "brand",
  pausado: "warn",
  encerrado: "muted",
  reembolsado: "danger",
};
export function ContratoBadge({ status }: { status: string }) {
  return <Badge tone={contratoTone[status] ?? "muted"}>{status}</Badge>;
}

const reembolsoTone: Record<string, Tone> = {
  solicitado: "info",
  em_negociacao: "warn",
  revertido: "brand",
  aprovado: "muted",
  concluido: "muted",
};
const reembolsoLabel: Record<string, string> = {
  solicitado: "Solicitado",
  em_negociacao: "Em negociação",
  revertido: "Revertido",
  aprovado: "Aprovado",
  concluido: "Concluído",
};
export function ReembolsoBadge({ status }: { status: string }) {
  return <Badge tone={reembolsoTone[status] ?? "muted"}>{reembolsoLabel[status] ?? status}</Badge>;
}

/* ---------------- Link para o Kommo (ponte com o CRM) ---------------- */

export function KommoLink({ url, className = "" }: { url: string; className?: string }) {
  if (!url) return <span className="text-faint">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-md border border-info/30 bg-info/10 px-2 py-1 text-2xs font-semibold text-info-text hover:bg-info/20 ${className}`}
      title="Abrir card no Kommo"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 3h7v7M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Kommo
    </a>
  );
}

/* ---------------- Stat card (dashboard) ---------------- */

export function Stat({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "ink" | "brand" | "danger" | "warn";
}) {
  const valueCls =
    tone === "brand"
      ? "text-brand-text"
      : tone === "danger"
      ? "text-danger-text"
      : tone === "warn"
      ? "text-warn-text"
      : "text-ink";
  return (
    <div className="card p-4">
      <div className="text-2xs font-semibold uppercase tracking-wide text-faint">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabnum ${valueCls}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`card my-8 w-full ${wide ? "max-w-3xl" : "max-w-lg"} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-faint hover:bg-panel-2 hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

/* ---------------- Estados vazios / carregando ---------------- */

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
      </svg>
      {label}
    </div>
  );
}
