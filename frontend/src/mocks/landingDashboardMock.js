/**
 * landingDashboardMock.js
 *
 * Dataset fictício centralizado para a landing pública (MODO DEMO).
 * Todos os números são coerentes entre si e matematicamente fechados.
 * NUNCA usar dados reais de clientes aqui.
 *
 * Empresa de referência: Grupo Comercial Demo (MPE brasileira)
 * Referência mensal: Junho 2025
 */

export const landingDashboardMock = {
  // ── Resumo do mês de referência ───────────────────────────────────────────
  financialSummary: {
    receita: 185000,
    despesas: 129500,
    fluxo: 55500,
  },

  // ── KPIs consolidados ─────────────────────────────────────────────────────
  kpis: {
    saldo_total: 2450000,
    contas_pagar: 185200,
    contas_receber: 312400,
    inadimplencia: 4.2,
  },

  // ── DRE Simplificada (Junho/2025) ─────────────────────────────────────────
  // Conferência: 195000 - 23400 = 171600 | 171600 - 52000 - 43200 = 76400 ✓
  dre: {
    receita_bruta: 195000,
    deducoes: 23400,
    receita_liquida: 171600,
    custos: 52000,
    despesas: 43200,
    lucro: 76400,
  },

  // ── Fluxo de Caixa — 12 meses (Jan–Dez 2025) ─────────────────────────────
  cashflow: [
    { mes: 'Jan', entradas: 158000, saidas: 115000, saldo: 43000 },
    { mes: 'Fev', entradas: 162000, saidas: 118000, saldo: 44000 },
    { mes: 'Mar', entradas: 155000, saidas: 120000, saldo: 35000 },
    { mes: 'Abr', entradas: 168000, saidas: 119000, saldo: 49000 },
    { mes: 'Mai', entradas: 172000, saidas: 122000, saldo: 50000 },
    { mes: 'Jun', entradas: 185000, saidas: 128000, saldo: 57000 },
    { mes: 'Jul', entradas: 179000, saidas: 124000, saldo: 55000 },
    { mes: 'Ago', entradas: 188000, saidas: 126000, saldo: 62000 },
    { mes: 'Set', entradas: 192000, saidas: 130000, saldo: 62000 },
    { mes: 'Out', entradas: 195000, saidas: 132000, saldo: 63000 },
    { mes: 'Nov', entradas: 210000, saidas: 140000, saldo: 70000 },
    { mes: 'Dez', entradas: 225000, saidas: 148000, saldo: 77000 },
  ],

  // ── Receita vs Despesa — últimos 6 meses ──────────────────────────────────
  revenueVsExpenses: [
    { mes: 'Jan', receita: 158000, despesas: 115000 },
    { mes: 'Fev', receita: 162000, despesas: 118000 },
    { mes: 'Mar', receita: 155000, despesas: 120000 },
    { mes: 'Abr', receita: 168000, despesas: 119000 },
    { mes: 'Mai', receita: 172000, despesas: 122000 },
    { mes: 'Jun', receita: 185000, despesas: 128000 },
  ],

  // ── Distribuição de Custos — R$ 129.500 total ─────────────────────────────
  // Conferência: 51800 + 32375 + 25900 + 11635 + 7790 = 129500 ✓
  costDistribution: [
    { categoria: 'Folha de Pagamento', valor: 51800, percentual: 40 },
    { categoria: 'Fornecedores',       valor: 32375, percentual: 25 },
    { categoria: 'Impostos',           valor: 25900, percentual: 20 },
    { categoria: 'Marketing / TI',     valor: 11635, percentual: 9 },
    { categoria: 'Outros',             valor: 7790,  percentual: 6 },
  ],

  // ── Multi-empresa — Grupo Comercial Demo ──────────────────────────────────
  multiEmpresa: [
    { nome: 'Matriz SP',  faturamento: 185000, despesas: 129500, ebitda: 55500 },
    { nome: 'Filial RJ',  faturamento: 92000,  despesas: 65000,  ebitda: 27000 },
    { nome: 'Filial MG',  faturamento: 68000,  despesas: 48000,  ebitda: 20000 },
    { nome: 'Filial RS',  faturamento: 45000,  despesas: 32000,  ebitda: 13000 },
  ],
};
