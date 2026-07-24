"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { money, num, pct, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/Shell";
import { Stat, Spinner } from "@/components/ui";

type Row = {
  saldo_aberto: number;
  status: string;
  data_vencimento: string;
  aging_faixa: string | null;
  dias_atraso: number;
};

const AGING = ["1-15", "16-30", "31-60", "60+"] as const;

export default function Dashboard() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase
      .from("cob_parcelas_v")
      .select("saldo_aberto,status,data_vencimento,aging_faixa,dias_atraso")
      .in("status", ["a_vencer", "vencido"])
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  if (!rows) return <Spinner />;

  const carteira = rows.reduce((s, r) => s + num(r.saldo_aberto), 0);
  const vencidas = rows.filter((r) => r.status === "vencido");
  const inadimplencia = vencidas.reduce((s, r) => s + num(r.saldo_aberto), 0);
  const taxa = carteira > 0 ? inadimplencia / carteira : 0;

  const agingMap: Record<string, { total: number; qtd: number }> = {};
  for (const f of AGING) agingMap[f] = { total: 0, qtd: 0 };
  for (const r of vencidas) {
    if (r.aging_faixa && agingMap[r.aging_faixa]) {
      agingMap[r.aging_faixa].total += num(r.saldo_aberto);
      agingMap[r.aging_faixa].qtd += 1;
    }
  }
  const maxAging = Math.max(1, ...AGING.map((f) => agingMap[f].total));

  const hoje = todayISO();
  const inDays = (n: number) => {
    const d = new Date(hoje + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const previsao = (dias: number) =>
    rows
      .filter((r) => r.status === "a_vencer" && r.data_vencimento <= inDays(dias))
      .reduce((s, r) => s + num(r.saldo_aberto), 0);

  const p30 = previsao(30);
  const p60 = previsao(60);
  const p90 = previsao(90);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão financeira da carteira — o que há a receber e o que está inadimplente."
      />
      <div className="space-y-6 p-6">
        {/* KPIs principais */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Carteira a receber"
            value={money(carteira)}
            tone="brand"
            hint={`${rows.length} parcela(s) em aberto`}
          />
          <Stat
            label="Inadimplência (vencido)"
            value={money(inadimplencia)}
            tone={inadimplencia > 0 ? "danger" : "brand"}
            hint={`${vencidas.length} parcela(s) vencida(s)`}
          />
          <Stat
            label="Taxa de inadimplência"
            value={pct(taxa)}
            tone={taxa > 0.15 ? "danger" : taxa > 0 ? "warn" : "brand"}
            hint="Vencido ÷ carteira total"
          />
          <Stat
            label="A vencer (próx. 30 dias)"
            value={money(p30)}
            tone="ink"
            hint="Entrada de caixa projetada"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Aging */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Aging da inadimplência</h2>
              <span className="text-2xs text-faint">dias de atraso</span>
            </div>
            {inadimplencia === 0 ? (
              <p className="py-8 text-center text-sm text-brand-text">
                Nenhuma parcela vencida. Carteira em dia. ✓
              </p>
            ) : (
              <div className="space-y-3">
                {AGING.map((f) => {
                  const { total, qtd } = agingMap[f];
                  const tone =
                    f === "1-15" ? "bg-warn" : f === "16-30" ? "bg-warn" : "bg-danger";
                  return (
                    <div key={f}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted">
                          {f} dias <span className="text-faint">· {qtd}x</span>
                        </span>
                        <span className="tabnum font-medium text-ink">{money(total)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-panel-2">
                        <div
                          className={`h-full rounded-full ${tone}`}
                          style={{ width: `${(total / maxAging) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Previsão de caixa */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Previsão de caixa</h2>
              <span className="text-2xs text-faint">acumulado a vencer</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "30 dias", v: p30 },
                { l: "60 dias", v: p60 },
                { l: "90 dias", v: p90 },
              ].map((x) => (
                <div key={x.l} className="rounded-lg border border-border-soft bg-base p-3 text-center">
                  <div className="text-2xs uppercase tracking-wide text-faint">{x.l}</div>
                  <div className="mt-1 tabnum text-lg font-semibold text-brand-text">{money(x.v)}</div>
                </div>
              ))}
            </div>
            <Link
              href="/parcelas?status=a_vencer"
              className="mt-4 inline-flex text-xs text-info-text hover:underline"
            >
              Ver todas as parcelas a vencer →
            </Link>
          </div>
        </div>

        {vencidas.length > 0 && (
          <Link
            href="/parcelas?status=vencido"
            className="flex items-center justify-between rounded-xl border border-danger/30 bg-danger/8 px-5 py-3.5 text-sm hover:bg-danger/12"
          >
            <span className="text-danger-text">
              {vencidas.length} cobrança(s) vencida(s) somando {money(inadimplencia)} — priorize a régua de cobrança.
            </span>
            <span className="text-danger-text">Abrir →</span>
          </Link>
        )}
      </div>
    </>
  );
}
