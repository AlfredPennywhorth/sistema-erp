import React from 'react';
import { TrendingUp, Wallet, AlertCircle, BarChart3 } from 'lucide-react';
import { brl, pct } from './formatters';

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
      label: 'Saldo Total em Conta',
      value: brl(kpis.saldo_total),
      badge: '+12,4% vs mês anterior',
      badgeColor: 'text-emerald-400',
      icon: <Wallet size={18} />,
      iconBg: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      label: 'Contas a Receber',
      value: brl(kpis.contas_receber),
      badge: 'Pendente liquidação',
      badgeColor: 'text-cyan-400',
      icon: <TrendingUp size={18} />,
      iconBg: 'bg-cyan-500/10 text-cyan-400',
    },
    {
      label: 'Contas a Pagar',
      value: brl(kpis.contas_pagar),
      badge: 'Próx. vencimentos',
      badgeColor: 'text-rose-400',
      icon: <BarChart3 size={18} />,
      iconBg: 'bg-rose-500/10 text-rose-400',
    },
    {
      label: 'Inadimplência Est.',
      value: pct(kpis.inadimplencia),
      badge: 'Abaixo da média setorial',
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
