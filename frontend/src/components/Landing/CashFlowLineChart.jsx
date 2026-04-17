import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { brl } from './formatters';
import { TERMS } from '../../constants/terms';

function CashFlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs space-y-1 shadow-xl">
      <p className="font-bold text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'entradas' ? TERMS.graficos.legendaEntradas : p.name === 'saidas' ? TERMS.graficos.legendaSaidas : TERMS.graficos.legendaSaldo}: {brl(p.value)}
        </p>
      ))}
    </div>
  );
}

/**
 * CashFlowLineChart
 *
 * Gráfico de área do fluxo de caixa dos últimos 12 meses.
 * Props:
 *   cashflow: [{ mes, entradas, saidas, saldo }]
 */
export function CashFlowLineChart({ cashflow }) {
  if (!cashflow?.length) return null;

  return (
    <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 h-full">
      <h4 className="text-xs font-black mb-6 uppercase tracking-widest text-slate-400">
        {TERMS.financeiro.fluxoCaixa} (12 Meses)
      </h4>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cashflow} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#99f7ff" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#99f7ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="mes"
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CashFlowTooltip />} />
            <Area
              type="monotone"
              dataKey="entradas"
              stroke="#99f7ff"
              strokeWidth={2}
              fill="url(#colorEntradas)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="saidas"
              stroke="#a19ff9"
              strokeWidth={1.5}
              fill="none"
              dot={false}
              strokeDasharray="4 2"
            />
            <Area
              type="monotone"
              dataKey="saldo"
              stroke="#4ade80"
              strokeWidth={2}
              fill="url(#colorSaldo)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3 justify-end">
        {[
          { label: TERMS.graficos.legendaEntradas, color: '#99f7ff' },
          { label: TERMS.graficos.legendaSaidas,   color: '#a19ff9' },
          { label: TERMS.graficos.legendaSaldo,    color: '#4ade80' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-slate-500 font-bold">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
