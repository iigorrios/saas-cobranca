"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { money, dateBR } from "@/lib/format";
import { Contrato, PLATAFORMA_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/Shell";
import { ContratoBadge, Spinner, Empty } from "@/components/ui";
import ContratoModal from "@/components/ContratoModal";

type Row = Contrato & { cob_clientes: { nome: string } | null };

export default function ContratosPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .schema("legado" as "public").from("cob_contratos")
      .select("*, cob_clientes(nome)")
      .order("data_venda", { ascending: false });
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <PageHeader
        title="Contratos"
        subtitle="Cada renovação gera um novo contrato — o histórico nunca é sobrescrito."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            + Novo contrato
          </button>
        }
      />
      <div className="p-6">
        {!rows ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty>
            <p>Nenhum contrato cadastrado.</p>
            <button className="btn-ghost mt-2" onClick={() => setOpen(true)}>
              Criar o primeiro
            </button>
          </Empty>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-panel-2">
                <tr>
                  <th className="th">Cliente</th>
                  <th className="th">Plano</th>
                  <th className="th text-right">Valor</th>
                  <th className="th">Parc.</th>
                  <th className="th">Plataforma</th>
                  <th className="th">Vendedor</th>
                  <th className="th">Venda</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:bg-panel-2"
                    onClick={() => router.push(`/clientes/${c.cliente_id}`)}
                  >
                    <td className="td font-medium">
                      {c.cob_clientes?.nome ?? "—"}
                      {c.contrato_anterior_id && (
                        <span className="ml-2 text-2xs text-info-text">renovação</span>
                      )}
                    </td>
                    <td className="td text-muted">{c.plano}</td>
                    <td className="td text-right tabnum">{money(c.valor_total)}</td>
                    <td className="td tabnum text-muted">{c.numero_parcelas}x</td>
                    <td className="td text-muted">{PLATAFORMA_LABEL[c.plataforma] ?? c.plataforma}</td>
                    <td className="td text-muted">{c.vendedor || "—"}</td>
                    <td className="td tabnum text-muted">{dateBR(c.data_venda)}</td>
                    <td className="td">
                      <ContratoBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContratoModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          load();
        }}
      />
    </>
  );
}
