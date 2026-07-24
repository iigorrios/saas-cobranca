"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { money, num, todayISO } from "@/lib/format";
import {
  Cliente,
  Closer,
  Contrato,
  FORMAS_PAGAMENTO,
  FORMA_LABEL,
  METODOS,
  PLANOS,
  PLATAFORMAS,
  PLATAFORMA_LABEL,
} from "@/lib/types";
import { Modal } from "@/components/ui";

/** Prévia local das parcelas — espelha a regra da Edge/trigger para o usuário conferir antes de salvar. */
function previewParcelas(total: number, entrada: number, n: number) {
  if (n < 1) return [];
  const rows: number[] = [entrada];
  if (n > 1) {
    const restante = total - entrada;
    const base = Math.round((restante / (n - 1)) * 100) / 100;
    let soma = 0;
    for (let i = 2; i <= n; i++) {
      if (i < n) {
        rows.push(base);
        soma += base;
      } else {
        rows.push(Math.round((restante - soma) * 100) / 100);
      }
    }
  }
  return rows;
}

export default function ContratoModal({
  open,
  onClose,
  onSaved,
  clientePreset,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  clientePreset?: Cliente;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [closers, setClosers] = useState<Closer[]>([]);
  const [contratosCliente, setContratosCliente] = useState<Contrato[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [f, setF] = useState({
    cliente_id: "",
    plano: "Premium",
    valor_total: "",
    valor_entrada: "997",
    entrada_paga: true,
    entrada_metodo: "pix",
    forma_pagamento: "misto",
    plataforma: "guru",
    numero_parcelas: "12",
    data_venda: todayISO(),
    data_inicio_plano: todayISO(),
    data_fim_plano: "",
    vendedor: "",
    contrato_anterior_id: "",
    is_renovacao: false,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    supabase
      .from("cob_clientes")
      .select("*")
      .order("nome")
      .then(({ data }) => setClientes((data as Cliente[]) ?? []));
    supabase
      .from("closers")
      .select("id,nome")
      .order("nome")
      .then(({ data }) => setClosers((data as Closer[]) ?? []));
    if (clientePreset) set("cliente_id", clientePreset.id);
  }, [open, clientePreset]);

  useEffect(() => {
    if (!f.cliente_id) return setContratosCliente([]);
    supabase
      .from("cob_contratos")
      .select("*")
      .eq("cliente_id", f.cliente_id)
      .order("data_venda", { ascending: false })
      .then(({ data }) => setContratosCliente((data as Contrato[]) ?? []));
  }, [f.cliente_id]);

  const total = num(f.valor_total);
  const entrada = num(f.valor_entrada);
  const nParc = Math.max(1, parseInt(f.numero_parcelas || "1", 10));
  const preview = useMemo(
    () => previewParcelas(total, entrada, nParc),
    [total, entrada, nParc]
  );
  const somaPreview = preview.reduce((s, v) => s + v, 0);
  const diff = Math.abs(somaPreview - total);
  const fecha = diff <= 0.01;

  async function save() {
    setErr("");
    if (!f.cliente_id) return setErr("Selecione um cliente — contrato exige cliente vinculado.");
    if (total <= 0) return setErr("Informe o valor total do contrato.");
    if (entrada > total) return setErr("A entrada não pode ser maior que o valor total.");
    if (!f.data_fim_plano) return setErr("Informe a data de fim do plano.");
    setSaving(true);
    const { error } = await supabase.from("cob_contratos").insert({
      cliente_id: f.cliente_id,
      plano: f.plano,
      valor_total: total,
      valor_entrada: entrada,
      entrada_paga: f.entrada_paga,
      entrada_metodo: f.entrada_paga ? f.entrada_metodo : null,
      forma_pagamento: f.forma_pagamento,
      plataforma: f.plataforma,
      numero_parcelas: nParc,
      data_venda: f.data_venda,
      data_inicio_plano: f.data_inicio_plano,
      data_fim_plano: f.data_fim_plano,
      vendedor: f.vendedor || null,
      contrato_anterior_id: f.is_renovacao && f.contrato_anterior_id ? f.contrato_anterior_id : null,
      status: "ativo",
    });
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo contrato" wide>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Cliente *</label>
          <select
            className="input"
            value={f.cliente_id}
            onChange={(e) => set("cliente_id", e.target.value)}
            disabled={!!clientePreset}
          >
            <option value="">Selecione…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Plano</label>
          <select className="input" value={f.plano} onChange={(e) => set("plano", e.target.value)}>
            {PLANOS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Vendedor (closer)</label>
          <select className="input" value={f.vendedor} onChange={(e) => set("vendedor", e.target.value)}>
            <option value="">—</option>
            {closers.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Valor total (R$)</label>
          <input
            className="input tabnum"
            inputMode="decimal"
            value={f.valor_total}
            onChange={(e) => set("valor_total", e.target.value)}
            placeholder="4997"
          />
        </div>
        <div>
          <label className="label">Entrada (R$)</label>
          <input
            className="input tabnum"
            inputMode="decimal"
            value={f.valor_entrada}
            onChange={(e) => set("valor_entrada", e.target.value)}
          />
        </div>

        <div>
          <label className="label">Nº de parcelas</label>
          <input
            className="input tabnum"
            inputMode="numeric"
            value={f.numero_parcelas}
            onChange={(e) => set("numero_parcelas", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Forma de pagamento</label>
          <select
            className="input"
            value={f.forma_pagamento}
            onChange={(e) => set("forma_pagamento", e.target.value)}
          >
            {FORMAS_PAGAMENTO.map((x) => (
              <option key={x} value={x}>
                {FORMA_LABEL[x]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Plataforma</label>
          <select
            className="input"
            value={f.plataforma}
            onChange={(e) => set("plataforma", e.target.value)}
          >
            {PLATAFORMAS.map((x) => (
              <option key={x} value={x}>
                {PLATAFORMA_LABEL[x]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#22c55e]"
              checked={f.entrada_paga}
              onChange={(e) => set("entrada_paga", e.target.checked)}
            />
            Entrada já paga (à vista)
          </label>
          {f.entrada_paga && (
            <select
              className="input max-w-[120px]"
              value={f.entrada_metodo}
              onChange={(e) => set("entrada_metodo", e.target.value)}
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="label">Data da venda</label>
          <input
            type="date"
            className="input"
            value={f.data_venda}
            onChange={(e) => set("data_venda", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Início do plano</label>
            <input
              type="date"
              className="input"
              value={f.data_inicio_plano}
              onChange={(e) => set("data_inicio_plano", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Fim do plano</label>
            <input
              type="date"
              className="input"
              value={f.data_fim_plano}
              onChange={(e) => set("data_fim_plano", e.target.value)}
            />
          </div>
        </div>

        {/* Renovação */}
        <div className="col-span-2 rounded-lg border border-border-soft bg-base p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#22c55e]"
              checked={f.is_renovacao}
              onChange={(e) => set("is_renovacao", e.target.checked)}
            />
            É uma renovação de contrato anterior
          </label>
          {f.is_renovacao && (
            <select
              className="input mt-2"
              value={f.contrato_anterior_id}
              onChange={(e) => set("contrato_anterior_id", e.target.value)}
            >
              <option value="">Selecione o contrato anterior…</option>
              {contratosCliente.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.plano} · {money(c.valor_total)} · venda {c.data_venda}
                </option>
              ))}
            </select>
          )}
          {f.is_renovacao && contratosCliente.length === 0 && (
            <p className="mt-1 text-2xs text-faint">
              Este cliente não tem contratos anteriores cadastrados.
            </p>
          )}
        </div>

        {/* Prévia das parcelas + validação de fechamento */}
        <div className="col-span-2 rounded-lg border border-border bg-panel-2 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">Prévia das {nParc} parcela(s)</span>
            <span className={fecha ? "text-brand-text" : "text-warn-text"}>
              Soma {money(somaPreview)} {fecha ? "✓ fecha com o total" : `⚠ difere ${money(diff)} do total`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {preview.map((v, i) => (
              <span
                key={i}
                className="rounded-md border border-border-soft bg-base px-2 py-1 text-2xs tabnum text-muted"
              >
                {i + 1}ª {money(v)}
              </span>
            ))}
          </div>
          <p className="mt-2 text-2xs text-faint">
            As parcelas são geradas automaticamente pelo banco ao salvar (trigger). A última
            parcela absorve o resto do arredondamento para fechar o valor exato.
          </p>
        </div>

        {err && <p className="col-span-2 text-xs text-danger-text">{err}</p>}
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar e gerar parcelas"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
