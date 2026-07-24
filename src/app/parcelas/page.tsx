"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { money, num, dateBR, todayISO } from "@/lib/format";
import { METODOS, PARCELA_STATUS } from "@/lib/types";
import { PageHeader } from "@/components/Shell";
import { KommoLink, Modal, ParcelaBadge, Spinner, Empty } from "@/components/ui";

type Cobranca = {
  id: number;
  contrato_id: string;
  numero_parcela: number;
  valor_previsto: number;
  valor_pago: number;
  saldo_aberto: number;
  data_vencimento: string;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  cancelada_por_reembolso: boolean;
  status: string;
  dias_atraso: number;
  aging_faixa: string | null;
  numero_parcelas: number;
  plano: string;
  vendedor: string | null;
  cliente_id: string;
  cliente_nome: string;
  kommo_lead_url: string;
};

const STATUS_LABEL: Record<string, string> = {
  a_vencer: "A vencer",
  vencido: "Vencido",
  pago: "Pago",
  cancelado: "Cancelado",
};

function ParcelasInner() {
  const sp = useSearchParams();
  const [rows, setRows] = useState<Cobranca[] | null>(null);
  const [status, setStatus] = useState<string>(sp.get("status") ?? "");
  const [vendedor, setVendedor] = useState<string>("");
  const [q, setQ] = useState("");
  const [aging, setAging] = useState<string>("");
  const [pagar, setPagar] = useState<Cobranca | null>(null);

  async function load() {
    const { data } = await supabase
      .from("cob_cobrancas_v")
      .select("*")
      .order("data_vencimento", { ascending: true });
    setRows((data as Cobranca[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  const vendedores = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.vendedor).filter(Boolean))) as string[],
    [rows]
  );

  const filtered = (rows ?? []).filter((r) => {
    if (status && r.status !== status) return false;
    if (vendedor && r.vendedor !== vendedor) return false;
    if (aging && r.aging_faixa !== aging) return false;
    if (q && !r.cliente_nome.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const totalAberto = filtered
    .filter((r) => r.status === "a_vencer" || r.status === "vencido")
    .reduce((s, r) => s + num(r.saldo_aberto), 0);

  return (
    <>
      <PageHeader
        title="Cobranças"
        subtitle="Todas as parcelas. O link do Kommo fica sempre visível — é a ponte com o CRM."
      />
      <div className="space-y-4 p-6">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-[220px]"
            placeholder="Buscar cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input max-w-[150px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {PARCELA_STATUS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select className="input max-w-[160px]" value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
            <option value="">Todos vendedores</option>
            {vendedores.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select className="input max-w-[150px]" value={aging} onChange={(e) => setAging(e.target.value)}>
            <option value="">Todo aging</option>
            <option value="1-15">Atraso 1-15</option>
            <option value="16-30">Atraso 16-30</option>
            <option value="31-60">Atraso 31-60</option>
            <option value="60+">Atraso 60+</option>
          </select>
          {(status || vendedor || aging || q) && (
            <button
              className="btn-ghost"
              onClick={() => {
                setStatus("");
                setVendedor("");
                setAging("");
                setQ("");
              }}
            >
              Limpar
            </button>
          )}
          <div className="ml-auto text-sm text-muted">
            {filtered.length} parcela(s) · aberto{" "}
            <span className="tabnum font-semibold text-brand-text">{money(totalAberto)}</span>
          </div>
        </div>

        {!rows ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty>Nenhuma parcela para esse filtro.</Empty>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-panel-2">
                <tr>
                  <th className="th">Cliente</th>
                  <th className="th">Parc.</th>
                  <th className="th text-right">Previsto</th>
                  <th className="th text-right">Pago</th>
                  <th className="th text-right">Saldo</th>
                  <th className="th">Vencimento</th>
                  <th className="th">Status</th>
                  <th className="th">Kommo</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-panel-2">
                    <td className="td">
                      <Link href={`/clientes/${r.cliente_id}`} className="font-medium hover:text-brand-text">
                        {r.cliente_nome}
                      </Link>
                      <div className="text-2xs text-faint">
                        {r.plano}
                        {r.vendedor ? ` · ${r.vendedor}` : ""}
                      </div>
                    </td>
                    <td className="td tabnum text-muted">
                      {r.numero_parcela}/{r.numero_parcelas}
                    </td>
                    <td className="td text-right tabnum">{money(r.valor_previsto)}</td>
                    <td className="td text-right tabnum text-muted">{money(r.valor_pago)}</td>
                    <td className="td text-right tabnum">
                      <span className={r.status === "vencido" ? "text-danger-text" : ""}>
                        {money(r.saldo_aberto)}
                      </span>
                    </td>
                    <td className="td tabnum text-muted">
                      {dateBR(r.data_vencimento)}
                      {r.status === "vencido" && (
                        <span className="ml-1 text-2xs text-danger-text">+{r.dias_atraso}d</span>
                      )}
                    </td>
                    <td className="td">
                      <ParcelaBadge status={r.status} />
                    </td>
                    <td className="td">
                      <KommoLink url={r.kommo_lead_url} />
                    </td>
                    <td className="td text-right">
                      {r.status !== "cancelado" && r.saldo_aberto > 0 ? (
                        <button className="btn-ghost px-2 py-1 text-2xs" onClick={() => setPagar(r)}>
                          Registrar pagto
                        </button>
                      ) : r.status === "pago" ? (
                        <span className="text-2xs text-brand-text">✓ {dateBR(r.data_pagamento)}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PagamentoModal
        parcela={pagar}
        onClose={() => setPagar(null)}
        onSaved={() => {
          setPagar(null);
          load();
        }}
      />
    </>
  );
}

function PagamentoModal({
  parcela,
  onClose,
  onSaved,
}: {
  parcela: Cobranca | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayISO());
  const [metodo, setMetodo] = useState("pix");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (parcela) {
      setValor(String(num(parcela.saldo_aberto)));
      setData(todayISO());
      setMetodo(parcela.metodo_pagamento ?? "pix");
      setObs("");
      setErr("");
    }
  }, [parcela]);

  if (!parcela) return null;

  const pagoAtual = num(parcela.valor_pago);
  const novoPago = pagoAtual + num(valor);
  const previsto = num(parcela.valor_previsto);
  const saldoRestante = Math.round((previsto - novoPago) * 100) / 100;
  const parcial = saldoRestante > 0.01;

  async function save() {
    setErr("");
    if (num(valor) <= 0) return setErr("Informe um valor de pagamento maior que zero.");
    setSaving(true);
    // Nunca editamos valor_previsto numa baixa. Somamos ao valor_pago e, se
    // ficar saldo, ele permanece em aberto na mesma parcela.
    const patch: Record<string, unknown> = {
      valor_pago: Math.round(novoPago * 100) / 100,
      metodo_pagamento: metodo,
      data_pagamento: saldoRestante <= 0.01 ? data : parcela!.data_pagamento,
    };
    if (obs.trim()) patch.observacao = obs.trim();
    const { error } = await supabase.from("cob_parcelas").update(patch).eq("id", parcela!.id);
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved();
  }

  return (
    <Modal open={!!parcela} onClose={onClose} title={`Registrar pagamento — ${parcela.cliente_nome}`}>
      <div className="space-y-3">
        <div className="rounded-lg border border-border-soft bg-base p-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Parcela {parcela.numero_parcela} · previsto</span>
            <span className="tabnum text-ink">{money(previsto)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Já pago</span>
            <span className="tabnum">{money(pagoAtual)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border-soft pt-1 text-muted">
            <span>Saldo em aberto</span>
            <span className="tabnum text-brand-text">{money(parcela.saldo_aberto)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor recebido agora (R$)</label>
            <input
              className="input tabnum"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data</label>
            <input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Método</label>
          <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Observação (opcional — nunca valores)</label>
          <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>

        {parcial && num(valor) > 0 && (
          <p className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn-text">
            Pagamento parcial: restará <span className="tabnum">{money(saldoRestante)}</span> em aberto
            nesta mesma parcela.
          </p>
        )}
        {err && <p className="text-xs text-danger-text">{err}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function ParcelasPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ParcelasInner />
    </Suspense>
  );
}
