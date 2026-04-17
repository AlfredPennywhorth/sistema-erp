import React from 'react';
import { TrendingUp, Wallet, AlertCircle, BarChart3 } from 'lucide-react';
import { brl, pct } from './formatters';
import { TERMS } from '../../constants/terms';

/**
 * KPIStatsCards
 *
 * Props:
 *   kpis: { saldo_total, contas_pagar, contas_receber, inadimplencia }
 */
export function KPIStatsCards({ kpis }) {
  if (!kpis) return null;

  const cards = [
    {
      label: TERMS.financeiro.saldoTotal,
      value: brl(kpis.saldo_total),
      badge: TERMS.financeiro.variacaoPrevio,
      badgeColor: 'text-blue-400',
      icon: <Wallet size={18} />,
      iconBg: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: TERMS.financeiro.contasReceber,
      value: brl(kpis.contas_receber),
      badge: TERMS.financeiro.pendenteLiquidacao,
      badgeColor: 'text-green-400',
      icon: <TrendingUp size={18} />,
      iconBg: 'bg-green-500/10 text-green-400',
    },
    {
      label: TERMS.financeiro.contasPagar,
      value: brl(kpis.contas_pagar),
      badge: TERMS.financeiro.proxVencimentos,
      badgeColor: 'text-rose-400',
      icon: <BarChart3 size={18} />,
      iconBg: 'bg-rose-500/10 text-rose-400',
    },
    {
      label: TERMS.financeiro.inadimplenciaEst,
      value: pct(kpis.inadimplencia),
      badge: TERMS.financeiro.abaixoMediaSetorial,
      badgeColor: 'text-amber-400',
      icon: <AlertCircle size={18} />,
      iconBg: 'bg-amber-500/10 text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm text-slate-400 font-medium leading-tight">{c.label}</p>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.iconBg}`}>
              {c.icon}
            </div>
          </div>
          <p className="text-2xl font-black text-white mb-2">{c.value}</p>
          <p className={`text-xs font-bold ${c.badgeColor}`}>{c.badge}</p>
        </div>
      ))}
    </div>
  );
}
