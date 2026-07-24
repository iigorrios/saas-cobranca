"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: "M3 12h4l3 8 4-16 3 8h4" },
  { href: "/parcelas", label: "Cobranças", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/clientes", label: "Clientes", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" },
  { href: "/contratos", label: "Contratos", icon: "M9 12h6M9 16h6M9 8h1M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" },
  { href: "/reembolsos", label: "Reembolsos", icon: "M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 7" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-panel">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-[#07100b] font-bold">R</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">Financeiro</div>
            <div className="text-2xs text-faint">Controle de cobranças</div>
          </div>
        </div>
        <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-3">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive(n.href)
                  ? "bg-brand/12 font-medium text-brand-text"
                  : "text-muted hover:bg-panel-2 hover:text-ink"
              }`}
            >
              <Icon d={n.icon} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 text-2xs text-faint">
          Cérebro financeiro · integra com o Kommo via link
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
