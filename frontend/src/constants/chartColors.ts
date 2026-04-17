/**
 * TOKENS SEMÂNTICOS DE CORES — Gráficos e Indicadores
 *
 * Regra de negócio:
 *   Entradas / Receitas / valores positivos = verde
 *   Saídas   / Despesas / valores negativos = vermelho
 *   Saldo    / consolidado / visão neutra   = azul
 *   Alertas                                 = âmbar
 *   Neutro   / apoio                        = cinza
 *   Categóricos secundários                 = roxo, ciano, teal
 */

export const CHART_COLORS = {
  // ── Semântica financeira primária ─────────────────────────────────────────
  entradas:        '#22c55e',   // verde — positivo
  receitas:        '#22c55e',   // verde — positivo
  saidas:          '#ef4444',   // vermelho — negativo
  despesas:        '#ef4444',   // vermelho — negativo

  // ── Saldo / visão consolidada ─────────────────────────────────────────────
  saldo:           '#3b82f6',   // azul — neutro/resultado
  saldoProjetado:  '#60a5fa',   // azul claro — projeção
  consolidado:     '#2563eb',   // azul escuro — consolidado

  // ── Alertas ───────────────────────────────────────────────────────────────
  alerta:          '#f59e0b',   // âmbar

  // ── Neutro / apoio ────────────────────────────────────────────────────────
  neutro:          '#94a3b8',   // cinza

  // ── Categorias de custo ───────────────────────────────────────────────────
  folha:           '#3b82f6',   // azul
  fornecedores:    '#8b5cf6',   // roxo
  tributos:        '#f59e0b',   // âmbar
  marketing:       '#06b6d4',   // ciano
  tecnologia:      '#14b8a6',   // teal
  administrativo:  '#64748b',   // cinza-azulado
} as const;

/**
 * Paleta categórica fixa — use em ordem para gráficos de distribuição
 * onde as categorias não têm semântica financeira direta.
 */
export const CATEGORY_PALETTE: readonly string[] = [
  CHART_COLORS.folha,
  CHART_COLORS.fornecedores,
  CHART_COLORS.tributos,
  CHART_COLORS.marketing,
  CHART_COLORS.administrativo,
] as const;
