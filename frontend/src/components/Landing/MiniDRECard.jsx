import React from 'react';
import { brl } from './formatters';
import { TERMS } from '../../constants/terms';

/**
 * MiniDRECard
 *
 * Demonstração simplificada do DRE.
 * Props:
 *   dre: { receita_bruta, deducoes, receita_liquida, custos, despesas, lucro }
 */
export function MiniDRECard({ dre }) {
  if (!dre) return null;

  const rows = [
    { label: TERMS.contabil.receitaBruta,            value: dre.receita_bruta,  color: 'text-white',       prefix: '' },
    { label: TERMS.contabil.deducoes,                value: dre.deducoes,       color: 'text-rose-400',    prefix: '-' },
    { label: TERMS.contabil.receitaLiquida,          value: dre.receita_liquida,color: 'text-cyan-300',    prefix: '', bold: true, divider: true },
    { label: TERMS.contabil.custos,                  value: dre.custos,         color: 'text-rose-400',    prefix: '-' },
    { label: TERMS.contabil.despesasOperacionais,    value: dre.despesas,       color: 'text-rose-400',    prefix: '-' },
    { label: TERMS.contabil.lucroLiquido,            value: dre.lucro,          color: 'text-emerald-400', prefix: '', bold: true, highlight: true, divider: true },
  ];

  return (
    <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 h-full">
      <h4 className="text-xs font-black mb-6 uppercase tracking-widest text-slate-400">
        {TERMS.contabil.dreSimplificada} (Jun/25)
      </h4>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            {row.divider && <div className="h-px bg-white/10 mb-3" />}
            <div className={`flex justify-between text-sm ${row.bold ? 'font-black' : 'font-medium'}`}>
              <span className={row.highlight ? row.color : 'text-slate-400'}>{row.label}</span>
              <span className={row.color}>
                {row.prefix}{brl(row.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
