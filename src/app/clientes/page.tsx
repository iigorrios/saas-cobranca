"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isValidUrl, telefoneBR } from "@/lib/format";
import { Cliente } from "@/lib/types";
import { PageHeader } from "@/components/Shell";
import { KommoLink, Modal, Spinner, Empty } from "@/components/ui";

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("cob_clientes")
      .select("*")
      .order("created_at", { ascending: false });
    setClientes((data as Cliente[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = (clientes ?? []).filter((c) =>
    [c.nome, c.email, c.telefone].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cada cliente aponta para o card no Kommo — a ponte com o CRM."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            + Novo cliente
          </button>
        }
      />
      <div className="p-6">
        <input
          className="input mb-4 max-w-sm"
          placeholder="Buscar por nome, e-mail ou telefone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {!clientes ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty>
            <p>Nenhum cliente encontrado.</p>
            <button className="btn-ghost mt-2" onClick={() => setOpen(true)}>
              Cadastrar o primeiro
            </button>
          </Empty>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-panel-2">
                <tr>
                  <th className="th">Nome</th>
                  <th className="th">Telefone</th>
                  <th className="th">E-mail</th>
                  <th className="th">Lead ID</th>
                  <th className="th">Kommo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:bg-panel-2"
                    onClick={() => router.push(`/clientes/${c.id}`)}
                  >
                    <td className="td font-medium">{c.nome}</td>
                    <td className="td tabnum text-muted">{telefoneBR(c.telefone)}</td>
                    <td className="td text-muted">{c.email || "—"}</td>
                    <td className="td tabnum text-faint">{c.kommo_lead_id || "—"}</td>
                    <td className="td">
                      <KommoLink url={c.kommo_lead_url} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NovoClienteModal
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

function NovoClienteModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function reset() {
    setNome("");
    setTelefone("");
    setEmail("");
    setUrl("");
    setErr("");
  }

  async function save() {
    setErr("");
    if (!nome.trim()) return setErr("Informe o nome.");
    if (!url.trim() || !isValidUrl(url.trim()))
      return setErr("Informe uma URL válida do card no Kommo (http/https).");
    setSaving(true);
    const { error } = await supabase.from("cob_clientes").insert({
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      kommo_lead_url: url.trim(),
    });
    setSaving(false);
    if (error) return setErr(error.message);
    reset();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo cliente">
      <div className="space-y-3">
        <div>
          <label className="label">Nome *</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              placeholder="(11) 99999-8888"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">URL do card no Kommo *</label>
          <input
            className="input"
            placeholder="https://sua-conta.kommo.com/leads/detail/123456"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="mt-1 text-2xs text-faint">
            O ID do lead é extraído automaticamente da URL ao salvar.
          </p>
        </div>
        {err && <p className="text-xs text-danger-text">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar cliente"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
