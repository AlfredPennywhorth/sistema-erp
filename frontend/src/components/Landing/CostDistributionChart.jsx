import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { brl, pct } from './formatters';

const COLORS = ['#99f7ff', '#a19ff9', '#6063ee', '#f59e0b', '#94a3b8'];

function CostTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-white">{d.categoria}</p>
      <p className="text-slate-300">{brl(d.valor)} ({pct(d.percentual)})</p>
    </div>
  );
}

export function CostDistributionChart({ costDistribution }) {
  if (!costDistribution?.length) return null;

  return (
    <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5">
      <h4 className="text-xs font-black mb-6 uppercase tracking-widest text-slate-400">
        Distribuição de Custos
      </h4>
      <div className="flex flex-col sm:flex-row items-center gap-8">
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={costDistribution}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={68}
                dataKey="valor"
                strokeWidth={0}
              >
                {costDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CostTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2.5">
          {costDistribution.map((d, i) => (
            <div key={d.categoria} className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-xs text-slate-400 flex-1">{d.categoria}</span>
              <span className="text-xs font-bold text-white">{pct(d.percentual)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
