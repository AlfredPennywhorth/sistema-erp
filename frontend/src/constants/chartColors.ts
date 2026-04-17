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

// ── Primitivos ─────────────────────────────────────────────────────────────
// These three are promoted to named constants because they appear in multiple
// semantic aliases (e.g. entradas AND receitas both resolve to POSITIVO).
// Other semantic colors are unique and defined inline to keep the file lean.
const POSITIVO  = '#22c55e';
const NEGATIVO  = '#ef4444';
const AZUL      = '#3b82f6';

export const CHART_COLORS = {
  // ── Semântica financeira primária ─────────────────────────────────────────
  entradas:        POSITIVO,    // verde — positivo
  receitas:        POSITIVO,    // verde — positivo (alias)
  saidas:          NEGATIVO,    // vermelho — negativo
  despesas:        NEGATIVO,    // vermelho — negativo (alias)

  // ── Saldo / visão consolidada ─────────────────────────────────────────────
  saldo:           AZUL,        // azul — neutro/resultado
  saldoProjetado:  '#60a5fa',   // azul claro — projeção
  consolidado:     '#2563eb',   // azul escuro — consolidado

  // ── Alertas ───────────────────────────────────────────────────────────────
  alerta:          '#f59e0b',   // âmbar

  // ── Neutro / apoio ────────────────────────────────────────────────────────
  neutro:          '#94a3b8',   // cinza

  // ── Categorias de custo ───────────────────────────────────────────────────
  folha:           AZUL,        // azul
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
  CHART_COLORS.tecnologia,
  CHART_COLORS.administrativo,
] as const;

/**
 * Retorna a cor com canal alpha em hexadecimal (ex: withOpacity('#22c55e', 0.3) → '#22c55e4d').
 * Espera um valor hex válido no formato '#RRGGBB' ou '#RGB'.
 */
export function withOpacity(hex: string, opacity: number): string {
  if (!/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
    console.warn(`withOpacity: valor hex inválido "${hex}"`);
  }
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${alpha}`;
}
