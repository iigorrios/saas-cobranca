# Automação Autentique → Sistema de Cobranças (plano — fase futura)

> Status: **planejado, não implementado.** Decisões tomadas: construir depois;
> parcelamento preenchido por **revisão humana na tela** (IA sugere, humano confirma).

## Objetivo
Quando um contrato for **assinado no Autentique**, criar automaticamente o cliente e o
contrato no sistema, usando IA para interpretar os termos financeiros do PDF — sem que
ninguém precise digitar de novo. A verdade financeira só é confirmada por uma pessoa.

## Princípio inegociável
IA **sugere**, humano **confirma**. Nenhum valor financeiro entra como oficial no
automático (mesmo princípio do resto do sistema: nada de valor em campo não auditável).

## Arquitetura

```
Autentique (documento assinado)
     │  webhook: document.finished / signed
     ▼
Webhook handler  (Vercel Function /api/autentique  OU  Supabase Edge Function)
     │  1. valida a assinatura do webhook (secret)
     │  2. GraphQL do Autentique: baixa PDF + metadados dos signatários
     │  3. IA (Claude via Vercel AI Gateway) extrai termos financeiros → JSON estruturado
     │  4. dedupe: procura cliente por CPF / e-mail / telefone
     │  5. cria cob_clientes (se novo) + cob_contratos em estado "pendente de revisão"
     │  6. guarda o PDF de origem + o JSON extraído (auditoria)
     ▼
Tela "Contratos a revisar": secretaria confere valor total, define ENTRADA e Nº DE
PARCELAS, vincula a URL do Kommo, e aprova → aí o trigger gera as parcelas normalmente.
```

## O que vem de onde (híbrido — não usar IA para tudo)

| Dado | Fonte | IA? |
|---|---|---|
| Nome, CPF, e-mail, telefone | Metadados do signatário (API Autentique) | Não (já estruturado) |
| Valor total | Texto do contrato | Sim |
| Plano / período (ex.: 12 meses) | Texto do contrato | Sim |
| Plataforma de pagamento citada | Texto do contrato | Sim (dica, confirmar) |
| Multa rescisória (regra) | Texto do contrato | Sim (informativo) |
| **Entrada, nº de parcelas, vencimentos** | **NÃO está no contrato** | **Revisão humana** |
| kommo_lead_url, vendedor/closer | Kommo / operação | Revisão humana |

> ⚠️ O contrato descreve **etapas de entrega do serviço** (50% setup / 20% mentorias /
> 30% reavaliações), que **não são** o cronograma de pagamento. O parcelamento real vive
> na plataforma de pagamento (Guru/Kiwify) — por isso a revisão humana no MVP.

## Extração por IA — formato de saída (structured output)
A IA deve devolver JSON validado contra um schema, algo como:
```json
{
  "cliente": { "nome": "", "cpf": "", "email": null, "telefone": null },
  "contrato": {
    "valor_total": 0,
    "plano_periodo_meses": 12,
    "plataforma_citada": ["kiwify"],
    "multa_rescisoria_pct": 30,
    "data_assinatura": "YYYY-MM-DD"
  },
  "confianca": 0.0,
  "trechos_fonte": { "valor_total": "citação literal do PDF" }
}
```
`confianca` baixa ou campo faltando → marca para revisão obrigatória. Guardar
`trechos_fonte` para a pessoa auditar contra o PDF.

## Ajuste de schema necessário (quando for implementar)
Pequena mudança em `cob_contratos` para suportar o estado de revisão e a origem:
- `origem text default 'manual'` (`'manual' | 'autentique'`)
- `revisado boolean default true` (contratos vindos da IA entram como `false`)
- `autentique_documento_id text`, `pdf_url text`, `extracao_json jsonb` (auditoria)
- **Importante:** o trigger de geração de parcelas passa a rodar só quando `revisado`
  vira `true` (na aprovação), não no insert — para não gerar parcelas antes da conferência.

## Segurança / LGPD
- Token do Autentique e chave de IA como **secrets** (Vercel/Supabase), nunca no repo.
- Verificar a assinatura do webhook do Autentique.
- CPF é dado pessoal (LGPD): acesso restrito, e — quando adicionarmos login — restringir
  essa tela por papel.

## Custo estimado
Extração por documento com Claude via AI Gateway: poucos centavos por contrato.

## Checklist de implementação (futuro)
- [ ] Criar app/integração no Autentique e obter token + segredo de webhook
- [ ] Endpoint de webhook (validação de assinatura)
- [ ] Cliente GraphQL do Autentique (baixar PDF + signatários)
- [ ] Função de extração por IA (structured output + validação de schema)
- [ ] Dedupe de cliente (CPF/e-mail/telefone)
- [ ] Migração `cob_contratos` (origem/revisado/auditoria) + ajuste do trigger
- [ ] Tela "Contratos a revisar" (aprovar → gera parcelas)
- [ ] Logs/auditoria (PDF + JSON + quem aprovou)
```
