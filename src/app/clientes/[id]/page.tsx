"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { money, num, dateBR, telefoneBR } from "@/lib/format";
import { Cliente, Contrato, ParcelaView, PLATAFORMA_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/Shell";
import { ContratoBadge, ParcelaBadge, Spinner, Stat } from "@/components/ui";
import ContratoModal from "@/components/ContratoModal";

export default function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [openContrato, setOpenContrato] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: cl }, { data: cts }] = await Promise.all([
      supabase.schema("legado" as "public").from("cob_clientes").select("*").eq("id", id).single(),
      supabase.schema("legado" as "public").from("cob_contratos").select("*").eq("cliente_id", id).order("data_venda", { ascending: false }),
    ]);
    setCliente((cl as Cliente) ?? null);
    const contratosArr = (cts as Contrato[]) ?? [];
    setContratos(contratosArr);
    if (contratosArr.length) {
      const { data: ps } = await supabase
        .from("cob_parcelas_v")
        .select("*")
        .in(
          "contrato_id",
          contratosArr.map((c) => c.id)
        )
        .order("data_vencimento");
      setParcelas((ps as ParcelaView[]) ?? []);
    } else {
      setParcelas([]);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <Spinner />;
  if (!cliente)
    return (
      <div className="p-6 text-sm text-muted">
        Cliente não encontrado. <Link href="/clientes" className="text-info-text">Voltar</Link>
      </div>
    );

  const totalContratado = contratos.reduce((s, c) => s + num(c.valor_total), 0);
  const emAberto = parcelas
    .filter((p) => p.status === "a_vencer" || p.status === "vencido")
    .reduce((s, p) => s + num(p.saldo_aberto), 0);
  const vencido = parcelas
    .filter((p) => p.status === "vencido")
    .reduce((s, p) => s + num(p.saldo_aberto), 0);

  return (
    <>
      <PageHeader
        title={cliente.nome}
        subtitle={`${telefoneBR(cliente.telefone)} · ${cliente.email || "sem e-mail"}`}
        action={
          <div className="flex items-center gap-2">
            <a href={cliente.kommo_lead_url} target="_blank" rel="noopener noreferrer" className="btn-ghost border-info/40 text-info-text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 3h7v7M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Abrir card no Kommo
            </a>
            <button className="btn-primary" onClick={() => setOpenContrato(true)}>
              + Contrato
            </button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Contratos" value={contratos.length} hint={`Lead #${cliente.kommo_lead_id ?? "—"}`} />
          <Stat label="Total contratado" value={money(totalContratado)} />
          <Stat label="Em aberto" value={money(emAberto)} tone="brand" />
          <Stat label="Vencido" value={money(vencido)} tone={vencido > 0 ? "danger" : "brand"} />
        </div>

        {/* Contratos */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink">Contratos</h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-panel-2">
                <tr>
                  <th className="th">Plano</th>
                  <th className="th text-right">Valor</th>
                  <th className="th">Parc.</th>
                  <th className="th">Plataforma</th>
                  <th className="th">Vendedor</th>
                  <th className="th">Vigência</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {contratos.map((c) => (
                  <tr key={c.id} className="hover:bg-panel-2">
                    <td className="td font-medium">
                      {c.plano}
                      {c.contrato_anterior_id && (
                        <span className="ml-2 text-2xs text-info-text">↻ renovação</span>
                      )}
                    </td>
                    <td className="td text-right tabnum">{money(c.valor_total)}</td>
                    <td className="td tabnum text-muted">{c.numero_parcelas}x</td>
                    <td className="td text-muted">{PLATAFORMA_LABEL[c.plataforma] ?? c.plataforma}</td>
                    <td className="td text-muted">{c.vendedor || "—"}</td>
                    <td className="td tabnum text-2xs text-muted">
                      {dateBR(c.data_inicio_plano)} — {dateBR(c.data_fim_plano)}
                    </td>
                    <td className="td">
                      <ContratoBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Parcelas */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink">
            Todas as parcelas <span className="text-faint">({parcelas.length})</span>
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-panel-2">
                <tr>
                  <th className="th">#</th>
                  <th className="th text-right">Previsto</th>
                  <th className="th text-right">Pago</th>
                  <th className="th text-right">Saldo</th>
                  <th className="th">Vencimento</th>
                  <th className="th">Pagamento</th>
                  <th className="th">Método</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {parcelas.map((p) => (
                  <tr key={p.id} className="hover:bg-panel-2">
                    <td className="td tabnum text-muted">{p.numero_parcela}</td>
                    <td className="td text-right tabnum">{money(p.valor_previsto)}</td>
                    <td className="td text-right tabnum text-muted">{money(p.valor_pago)}</td>
                    <td className="td text-right tabnum">{money(p.saldo_aberto)}</td>
                    <td className="td tabnum text-muted">{dateBR(p.data_vencimento)}</td>
                    <td className="td tabnum text-muted">{dateBR(p.data_pagamento)}</td>
                    <td className="td text-muted">{p.metodo_pagamento || "—"}</td>
                    <td className="td">
                      <ParcelaBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ContratoModal
        open={openContrato}
        onClose={() => setOpenContrato(false)}
        onSaved={() => {
          setOpenContrato(false);
          load();
        }}
        clientePreset={cliente}
      />
    </>
  );
}
