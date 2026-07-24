// Edge Function: sugerir-reembolso  (deployada no projeto Banco de Dados AF)
// Calcula a sugestão de reembolso PARCIAL de forma auditável.
// valor_sugerido = valor_total * (dias_restantes / dias_totais)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { contrato_id, data_referencia } = await req.json();
    if (!contrato_id)
      return new Response(JSON.stringify({ error: "contrato_id obrigatório" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: c, error } = await supabase
      .from("cob_contratos")
      .select("valor_total, data_inicio_plano, data_fim_plano")
      .eq("id", contrato_id)
      .single();
    if (error || !c)
      return new Response(JSON.stringify({ error: "contrato não encontrado" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    const hoje = (data_referencia ?? new Date().toISOString().slice(0, 10)) as string;
    const dias_totais = Math.max(1, daysBetween(c.data_inicio_plano, c.data_fim_plano));
    let dias_consumidos = daysBetween(c.data_inicio_plano, hoje);
    dias_consumidos = Math.min(Math.max(dias_consumidos, 0), dias_totais);
    const dias_restantes = dias_totais - dias_consumidos;
    const percentual_restante = dias_restantes / dias_totais;
    const valor_total = Number(c.valor_total);
    const valor_sugerido = Math.round(valor_total * percentual_restante * 100) / 100;

    return new Response(
      JSON.stringify({
        valor_total,
        dias_totais,
        dias_consumidos,
        dias_restantes,
        percentual_restante: Math.round(percentual_restante * 10000) / 100,
        percentual_consumido: Math.round((1 - percentual_restante) * 10000) / 100,
        valor_sugerido,
        data_referencia: hoje,
        formula: "valor_total × (dias_restantes ÷ dias_totais)",
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
