"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, invokeFn } from "@/lib/supabase";
import { money, num, dateBR, pct, todayISO } from "@/lib/format";
import {
  REEMBOLSO_MOTIVOS,
  REEMBOLSO_STATUS,
  Reembolso,
} from "@/lib/types";
import { PageHeader } from "@/components/Shell";
import { Modal, ReembolsoBadge, Spinner, Empty, Stat } from "@/components/ui";

type Row = Reembolso & {
  cob_contratos: {
    valor_total: number;
    plano: string;
    cob_clientes: { nome: string; kommo_lead_url: string } | null;
  } | null;
};

type ContratoOpt = {
  id: string;
  plano: string;
  valor_total: number;
  cob_clientes: { nome: string } | null;
};

const MOTIVO_LABEL = Object.fromEntries(REEMBOLSO_MOTIVOS.map((m) => [m.value, m.label]));

// Fluxo de status permitido
const NEXT: Record<string, string[]> = {
  solicitado: ["em_negociacao", "revertido", "aprovado"],
  em_negociacao: ["revertido", "aprovado"],
  revertido: [],
  aprovado: ["concluido"],
  concluido: [],
};

export default function ReembolsosPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("cob_reembolsos")
      .select("*, cob_contratos(valor_total, plano, cob_clientes(nome, kommo_lead_url))")
      .order("data_solicitacao", { ascending: false });
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = (rows ?? []).filter((r) => !status || r.status === status);

  // Métricas: retenção em negociação = revertidos ÷ total de solicitações
  const total = rows?.length ?? 0;
  const revertidos = (rows ?? []).filter((r) => r.status === "revertido").length;
  const taxaRetencao = total > 0 ? revertidos / total : 0;
  const custoTotal = (rows ?? [])
    .filter((r) => r.status === "aprovado" || r.status === "concluido")
    .reduce((s, r) => s + num(r.custo_efetivo_empresa ?? r.valor_devolvido_cliente), 0);

  async function mudarStatus(r: Row, novo: string) {
    if (
      (novo === "aprovado" || novo === "concluido") &&
      !window.confirm(
        "Aprovar/concluir este reembolso vai CANCELAR automaticamente todas as parcelas em aberto do contrato e marcá-lo como reembolsado. Continuar?"
      )
    )
      return;
    const { error } = await supabase.from("cob_reembolsos").update({ status: novo }).eq("id", r.id);
    if (error) alert(error.message);
    else load();
  }

  return (
    <>
      <PageHeader
        title="Reembolsos"
        subtitle="Solicitações de cancelamento e devolução — com cálculo auditável e cascata automática."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            + Nova solicitação
          </button>
        }
      />
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Solicitações" value={total} />
          <Stat
            label="Retenção em negociação"
            value={pct(taxaRetencao)}
            tone="brand"
            hint={`${revertidos} revertido(s) de ${total}`}
          />
          <Stat
            label="Custo efetivo (aprov./concl.)"
            value={money(custoTotal)}
            tone={custoTotal > 0 ? "warn" : "brand"}
          />
          <Stat
            label="Em negociação"
            value={(rows ?? []).filter((r) => r.status === "em_negociacao").length}
          />
        </div>

        <div className="flex items-center gap-2">
          <select className="input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {REEMBOLSO_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {status && (
            <button className="btn-ghost" onClick={() => setStatus("")}>
              Limpar
            </button>
          )}
        </div>

        {!rows ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty>Nenhuma solicitação de reembolso.</Empty>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-panel-2">
                <tr>
                  <th className="th">Cliente</th>
                  <th className="th">Tipo</th>
                  <th className="th">Motivo</th>
                  <th className="th">Solicitação</th>
                  <th className="th text-right">Devolvido</th>
                  <th className="th text-right">Custo empresa</th>
                  <th className="th">Status</th>
                  <th className="th">Avançar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-panel-2">
                    <td className="td font-medium">
                      {r.cob_contratos?.cob_clientes?.nome ?? "—"}
                      <div className="text-2xs text-faint">{r.cob_contratos?.plano}</div>
                    </td>
                    <td className="td text-muted capitalize">{r.tipo}</td>
                    <td className="td text-muted">
                      {MOTIVO_LABEL[r.motivo] ?? r.motivo}
                      {r.motivo === "outro" && r.motivo_detalhe && (
                        <div className="text-2xs text-faint">{r.motivo_detalhe}</div>
                      )}
                    </td>
                    <td className="td tabnum text-muted">{dateBR(r.data_solicitacao)}</td>
                    <td className="td text-right tabnum">{r.valor_devolvido_cliente != null ? money(r.valor_devolvido_cliente) : "—"}</td>
                    <td className="td text-right tabnum text-muted">{r.custo_efetivo_empresa != null ? money(r.custo_efetivo_empresa) : "—"}</td>
                    <td className="td">
                      <ReembolsoBadge status={r.status} />
                    </td>
                    <td className="td">
                      {NEXT[r.status]?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {NEXT[r.status].map((n) => (
                            <button
                              key={n}
                              className="rounded-md border border-border px-2 py-0.5 text-2xs text-muted hover:bg-panel hover:text-ink"
                              onClick={() => mudarStatus(r, n)}
                            >
                              {n === "em_negociacao" ? "negociar" : n}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-2xs text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-2xs text-faint">
          Ao marcar <b>aprovado</b> ou <b>concluído</b>, o banco cancela as parcelas em aberto do
          contrato (sem deletar — o histórico é preservado) e marca o contrato como reembolsado.
        </p>
      </div>

      <NovoReembolsoModal open={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />
    </>
  );
}

type Sugestao = {
  valor_total: number;
  dias_totais: number;
  dias_consumidos: number;
  dias_restantes: number;
  percentual_restante: number;
  percentual_consumido: number;
  valor_sugerido: number;
  formula: string;
};

function NovoReembolsoModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [contratos, setContratos] = useState<ContratoOpt[]>([]);
  const [contratoId, setContratoId] = useState("");
  const [tipo, setTipo] = useState<"total" | "parcial">("parcial");
  const [motivo, setMotivo] = useState<string>(REEMBOLSO_MOTIVOS[0].value);
  const [detalhe, setDetalhe] = useState("");
  const [dataSolic, setDataSolic] = useState(todayISO());
  const [valorDevolvido, setValorDevolvido] = useState("");
  const [custo, setCusto] = useState("");
  const [numParcelas, setNumParcelas] = useState("1");
  const [sug, setSug] = useState<Sugestao | null>(null);
  const [loadingSug, setLoadingSug] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setContratoId(""); setTipo("parcial"); setMotivo(REEMBOLSO_MOTIVOS[0].value);
    setDetalhe(""); setDataSolic(todayISO()); setValorDevolvido(""); setCusto("");
    setNumParcelas("1"); setSug(null); setErr("");
    supabase
      .from("cob_contratos")
      .select("id, plano, valor_total, cob_clientes(nome)")
      .neq("status", "reembolsado")
      .order("data_venda", { ascending: false })
      .then(({ data }) => setContratos((data as unknown as ContratoOpt[]) ?? []));
  }, [open]);

  const contratoSel = useMemo(
    () => contratos.find((c) => c.id === contratoId),
    [contratos, contratoId]
  );

  // Ao escolher contrato + tipo parcial → busca a sugestão auditável
  useEffect(() => {
    if (!contratoId || tipo !== "parcial") {
      setSug(null);
      return;
    }
    setLoadingSug(true);
    invokeFn<Sugestao>("sugerir-reembolso", { contrato_id: contratoId, data_referencia: dataSolic })
      .then((s) => {
        setSug(s);
        setValorDevolvido(String(s.valor_sugerido));
      })
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoadingSug(false));
  }, [contratoId, tipo, dataSolic]);

  useEffect(() => {
    if (tipo === "total" && contratoSel) setValorDevolvido(String(contratoSel.valor_total));
  }, [tipo, contratoSel]);

  async function save() {
    setErr("");
    if (!contratoId) return setErr("Selecione o contrato.");
    if (motivo === "outro" && !detalhe.trim()) return setErr("Descreva o motivo em 'detalhe'.");
    setSaving(true);
    const { data, error } = await supabase
      .from("cob_reembolsos")
      .insert({
        contrato_id: contratoId,
        data_solicitacao: dataSolic,
        tipo,
        motivo,
        motivo_detalhe: detalhe.trim() || null,
        status: "solicitado",
        valor_devolvido_cliente: valorDevolvido ? num(valorDevolvido) : null,
        custo_efetivo_empresa: custo ? num(custo) : null,
      })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      return setErr(error.message);
    }
    // Gera as parcelas de devolução (1x ou 2x) via Edge Function
    if (valorDevolvido && num(valorDevolvido) > 0) {
      try {
        await invokeFn("gerar-reembolso-parcelas", {
          reembolso_id: (data as { id: string }).id,
          num_parcelas: parseInt(numParcelas, 10),
          valor_total: num(valorDevolvido),
        });
      } catch (e) {
        // não bloqueia o cadastro; apenas avisa
        console.warn("gerar-reembolso-parcelas:", e);
      }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova solicitação de reembolso" wide>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Contrato *</label>
          <select className="input" value={contratoId} onChange={(e) => setContratoId(e.target.value)}>
            <option value="">Selecione…</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cob_clientes?.nome} · {c.plano} · {money(c.valor_total)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Tipo</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as "total" | "parcial")}>
            <option value="parcial">Parcial</option>
            <option value="total">Total</option>
          </select>
        </div>
        <div>
          <label className="label">Data da solicitação</label>
          <input type="date" className="input" value={dataSolic} onChange={(e) => setDataSolic(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="label">Motivo *</label>
          <select className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {REEMBOLSO_MOTIVOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {(motivo === "outro" || detalhe) && (
          <div className="col-span-2">
            <label className="label">Detalhe do motivo {motivo === "outro" ? "*" : "(opcional)"}</label>
            <input className="input" value={detalhe} onChange={(e) => setDetalhe(e.target.value)} />
          </div>
        )}

        {/* Cálculo auditável (parcial) */}
        {tipo === "parcial" && (
          <div className="col-span-2 rounded-lg border border-border bg-panel-2 p-3">
            <div className="mb-2 text-xs font-semibold text-ink">Sugestão auditável (proporcional ao tempo restante)</div>
            {loadingSug ? (
              <p className="text-xs text-muted">Calculando…</p>
            ) : sug ? (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                  <Kv k="Dias totais" v={sug.dias_totais} />
                  <Kv k="Dias consumidos" v={`${sug.dias_consumidos} (${sug.percentual_consumido}%)`} />
                  <Kv k="Dias restantes" v={`${sug.dias_restantes} (${sug.percentual_restante}%)`} />
                  <Kv k="Valor total" v={money(sug.valor_total)} />
                </div>
                <div className="mt-2 flex items-center justify-between rounded-md border border-brand/25 bg-brand/8 px-3 py-2">
                  <span className="text-xs text-muted">
                    {sug.formula} = <span className="text-brand-text">{money(sug.valor_sugerido)}</span>
                  </span>
                  <span className="text-2xs text-faint">editável abaixo</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-faint">Selecione um contrato para calcular.</p>
            )}
          </div>
        )}

        <div>
          <label className="label">Valor devolvido ao cliente (R$)</label>
          <input className="input tabnum" inputMode="decimal" value={valorDevolvido} onChange={(e) => setValorDevolvido(e.target.value)} />
        </div>
        <div>
          <label className="label">Custo efetivo p/ empresa (R$)</label>
          <input className="input tabnum" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="taxas não estornadas etc." />
        </div>
        <div>
          <label className="label">Devolução em</label>
          <select className="input" value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)}>
            <option value="1">1x (à vista, +15 dias)</option>
            <option value="2">2x (+15 e +45 dias)</option>
          </select>
        </div>

        {err && <p className="col-span-2 text-xs text-danger-text">{err}</p>}
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Registrar solicitação"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-faint">{k}</div>
      <div className="tabnum text-ink">{v}</div>
    </div>
  );
}
