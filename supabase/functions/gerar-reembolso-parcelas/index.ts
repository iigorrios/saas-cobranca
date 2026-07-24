// Edge Function: gerar-reembolso-parcelas  (deployada no projeto Banco de Dados AF)
// Gera as parcelas de DEVOLUÇÃO de um reembolso (1x ou 2x).
// Regra: 1ª parcela vence 15 dias após a solicitação; 2ª vence 30 dias após a 1ª.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { reembolso_id, num_parcelas, valor_total } = await req.json();
    const n = Number(num_parcelas);
    const total = Number(valor_total);
    if (!reembolso_id || ![1, 2].includes(n) || !(total >= 0))
      return new Response(
        JSON.stringify({ error: "parâmetros inválidos (reembolso_id, num_parcelas 1|2, valor_total)" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: r, error: er } = await supabase
      .from("cob_reembolsos")
      .select("data_solicitacao")
      .eq("id", reembolso_id)
      .single();
    if (er || !r)
      return new Response(JSON.stringify({ error: "reembolso não encontrado" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    await supabase.from("cob_reembolso_parcelas").delete().eq("reembolso_id", reembolso_id);

    const venc1 = addDays(r.data_solicitacao, 15);
    let rows: Array<Record<string, unknown>>;
    if (n === 1) {
      rows = [{ reembolso_id, numero_parcela: 1, valor_previsto: total, data_vencimento: venc1 }];
    } else {
      const p1 = Math.round((total / 2) * 100) / 100;
      const p2 = Math.round((total - p1) * 100) / 100;
      rows = [
        { reembolso_id, numero_parcela: 1, valor_previsto: p1, data_vencimento: venc1 },
        { reembolso_id, numero_parcela: 2, valor_previsto: p2, data_vencimento: addDays(venc1, 30) },
      ];
    }
    const { data: inserted, error: ei } = await supabase
      .from("cob_reembolso_parcelas")
      .insert(rows)
      .select();
    if (ei)
      return new Response(JSON.stringify({ error: ei.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    return new Response(JSON.stringify({ parcelas: inserted }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
