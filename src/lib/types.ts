export const PLANOS = ["Protagonista", "Embaixador", "Premium", "Digital"] as const;
export const FORMAS_PAGAMENTO = ["pix", "cartao", "misto"] as const;
export const PLATAFORMAS = ["guru", "kiwify", "braip", "pix_direto"] as const;
export const METODOS = ["pix", "cartao", "boleto"] as const;
export const CONTRATO_STATUS = ["ativo", "pausado", "encerrado", "reembolsado"] as const;
export const PARCELA_STATUS = ["a_vencer", "vencido", "pago", "cancelado"] as const;

export const REEMBOLSO_MOTIVOS = [
  { value: "expectativa_desalinhada_venda", label: "Expectativa desalinhada na venda" },
  { value: "dificuldade_financeira", label: "Dificuldade financeira" },
  { value: "insatisfacao_entrega", label: "Insatisfação com a entrega" },
  { value: "demora_atendimento", label: "Demora no atendimento" },
  { value: "problema_saude_pessoal", label: "Problema de saúde / pessoal" },
  { value: "nao_adaptou_formato", label: "Não se adaptou ao formato" },
  { value: "outro", label: "Outro" },
] as const;

export const REEMBOLSO_STATUS = [
  "solicitado", "em_negociacao", "revertido", "aprovado", "concluido",
] as const;

export const PLATAFORMA_LABEL: Record<string, string> = {
  guru: "Guru", kiwify: "Kiwify", braip: "Braip", pix_direto: "Pix direto",
};
export const FORMA_LABEL: Record<string, string> = {
  pix: "Pix", cartao: "Cartão", misto: "Misto",
};

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  kommo_lead_url: string;
  kommo_lead_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Contrato = {
  id: string;
  cliente_id: string;
  plano: string;
  valor_total: number;
  valor_entrada: number;
  entrada_paga: boolean;
  entrada_metodo: string | null;
  forma_pagamento: string;
  plataforma: string;
  numero_parcelas: number;
  data_venda: string;
  data_inicio_plano: string;
  data_fim_plano: string;
  contrato_anterior_id: string | null;
  vendedor: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ParcelaView = {
  id: number;
  contrato_id: string;
  numero_parcela: number;
  valor_previsto: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  cancelada_por_reembolso: boolean;
  observacao: string | null;
  saldo_aberto: number;
  status: (typeof PARCELA_STATUS)[number];
  dias_atraso: number;
  aging_faixa: "1-15" | "16-30" | "31-60" | "60+" | null;
};

export type Reembolso = {
  id: string;
  contrato_id: string;
  data_solicitacao: string;
  tipo: "total" | "parcial";
  motivo: string;
  motivo_detalhe: string | null;
  status: (typeof REEMBOLSO_STATUS)[number];
  valor_devolvido_cliente: number | null;
  custo_efetivo_empresa: number | null;
  created_at: string;
  updated_at: string;
};

export type Closer = { id: string; nome: string };
