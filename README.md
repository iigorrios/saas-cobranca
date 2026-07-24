# Financeiro — Controle de Cobranças

O "cérebro financeiro" da consultoria. Substitui o controle manual de parcelas que
hoje vive em texto livre no card do lead do **Kommo**. Não substitui o Kommo como CRM:
cada cobrança tem um link direto para o card do lead — essa é a ponte entre os dois
sistemas.

**Stack:** Next.js 15 (App Router) · Supabase (PostgreSQL + Edge Functions) · Tailwind.
Deploy alvo: **Vercel**. Tema escuro, verde = positivo/em dia, vermelho/laranja = alerta.

---

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # já vem preenchido com o projeto Banco de Dados AF
npm run dev                  # http://localhost:3000
```

## Deploy na Vercel

1. Suba o repositório no GitHub.
2. Importe na Vercel (framework detectado: Next.js).
3. Configure as env vars (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

> A `anon key` é pública e protegida por RLS. **Hoje não há login** (decisão do time):
> as políticas RLS são permissivas para `anon`. Ao adicionar Supabase Auth, basta
> trocar as políticas por `auth.uid()`/roles — o app já usa o cliente Supabase.

---

## Banco de dados (Supabase — projeto *Banco de Dados AF*)

Tabelas com prefixo `cob_` para conviver com o schema legado. Detalhe completo em
[`supabase/schema.sql`](supabase/schema.sql).

| Tabela | Papel |
| --- | --- |
| `cob_clientes` | Cliente + `kommo_lead_url` (obrigatório) e `kommo_lead_id` extraído da URL |
| `cob_contratos` | Contrato; cada renovação é um **novo** registro (`contrato_anterior_id`) |
| `cob_parcelas` | Parcelas do contrato (status derivado, nunca gravado pela app) |
| `cob_reembolsos` | Solicitações de reembolso (motivo em lista fechada) |
| `cob_reembolso_parcelas` | Devolução parcelada (1x/2x) |
| `closers` *(existente)* | Reaproveitada como lista fechada de vendedores |

**Views:** `cob_parcelas_v`, `cob_reembolso_parcelas_v`, `cob_cobrancas_v`
(status + `saldo_aberto` + `dias_atraso` + `aging_faixa`).

### Regras críticas implementadas no banco (não dependem da app)
- **Geração de parcelas**: trigger `AFTER INSERT` no contrato. 1ª = entrada na data da
  venda; demais mensais; a última absorve o resto do arredondamento (fecha o total exato).
- **Cascata de reembolso**: ao marcar reembolso `aprovado`/`concluido`, as parcelas em
  aberto viram `cancelada_por_reembolso` (**nunca deletadas**) e o contrato vira `reembolsado`.
- **Guarda**: `valor_pago` de parcela cancelada não pode ser alterado.
- **Normalização**: telefone só dígitos; `kommo_lead_id` extraído da URL.

### Edge Functions
- **`sugerir-reembolso`** — cálculo auditável do reembolso parcial:
  `valor_total × (dias_restantes ÷ dias_totais)`. Retorna dias totais/consumidos/restantes
  e percentuais (a secretaria vê a conta, não só o resultado).
- **`gerar-reembolso-parcelas`** — gera a devolução em 1x/2x (1ª +15 dias, 2ª +30 dias após a 1ª).

Fontes versionadas em [`supabase/functions/`](supabase/functions).

---

## Telas
- **Dashboard** — carteira a receber, inadimplência e taxa, aging, previsão de caixa 30/60/90.
- **Cobranças** — todas as parcelas, filtros (status, vendedor, aging, cliente), link do Kommo
  sempre visível, registro de pagamento (parcial deixa saldo na mesma parcela).
- **Clientes** — cadastro com validação de URL; detalhe com histórico de contratos e parcelas.
- **Contratos** — criação com prévia das parcelas e validação de fechamento (tolerância R$0,01).
- **Reembolsos** — solicitação com cálculo auditável, fluxo de status e taxa de retenção.

## Fora de escopo (fase futura de automação)
- Integração automática via API/webhooks do Kommo (hoje: link manual como ponte).
- Baixa automática via webhook das plataformas (Guru/Kiwify/Braip).
- Envio automático de cobranças/mensagens (WhatsApp).
- Autenticação/perfis de acesso (hoje acesso único, sem login).
