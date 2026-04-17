import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { brl } from './formatters';

function HeroTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs space-y-1 shadow-xl">
      <p className="font-bold text-white">{label}</p>
      <p className="text-cyan-300">Receita: {brl(payload[0]?.value)}</p>
      <p className="text-purple-300">Despesas: {brl(payload[1]?.value)}</p>
    </div>
  );
}

/**
 * HeroFinancialChart
 *
 * Gráfico de barras usado no hero da landing.
 * Props:
 *   revenueVsExpenses: [{ mes, receita, despesas }]
 *   financialSummary:  { receita, despesas, fluxo }
 */
export function HeroFinancialChart({ revenueVsExpenses, financialSummary }) {
  const last6 = (revenueVsExpenses || []).slice(-6);

  return (
    <div className="flex-1 w-full relative">
      <div
        className="p-6 rounded-2xl shadow-2xl relative overflow-hidden"
        style={{
          background: 'rgba(28, 37, 62, 0.4)',
          backdropFilter: 'blur(12px)',
          border: '0.5px solid rgba(153, 247, 255, 0.15)',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_8px_#99f7ff]" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Fluxo Financeiro em Tempo Real
            </span>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/20" />
            ))}
          </div>
        </div>

        {/* KPI rápido */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 p-4 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase mb-1 font-bold">Receita Mensal</p>
            <p className="text-2xl font-bold text-cyan-300">{brl(financialSummary?.receita)}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase mb-1 font-bold">Despesas</p>
            <p className="text-2xl font-bold text-purple-300">{brl(financialSummary?.despesas)}</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last6} barGap={2} barCategoryGap="20%">
              <XAxis
                dataKey="mes"
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<HeroTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="receita" radius={[4, 4, 0, 0]} maxBarSize={20}>
                {last6.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === last6.length - 1 ? '#99f7ff' : 'rgba(153,247,255,0.3)'}
                  />
                ))}
              </Bar>
              <Bar dataKey="despesas" radius={[4, 4, 0, 0]} maxBarSize={20}>
                {last6.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === last6.length - 1 ? '#a19ff9' : 'rgba(161,159,249,0.25)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fluxo líquido flutuante */}
        <div
          className="absolute -bottom-4 -left-4 p-4 rounded-xl border border-purple-400/30 hidden lg:block"
          style={{ background: 'rgba(28, 37, 62, 0.8)', backdropFilter: 'blur(12px)' }}
        >
          <p className="text-xs text-purple-300 font-bold">Fluxo Líquido</p>
          <p className="text-xl font-bold text-white">+ {brl(financialSummary?.fluxo)}</p>
        </div>
      </div>
    </div>
  );
}
