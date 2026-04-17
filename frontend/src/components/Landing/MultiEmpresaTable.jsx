import React from 'react';
import { brl } from './formatters';

/**
 * MultiEmpresaTable
 *
 * Tabela consolidada de unidades do grupo.
 * Props:
 *   multiEmpresa: [{ nome, faturamento, despesas, ebitda }]
 */
export function MultiEmpresaTable({ multiEmpresa }) {
  if (!multiEmpresa?.length) return null;

  const totalFaturamento = multiEmpresa.reduce((s, e) => s + e.faturamento, 0);
  const totalDespesas    = multiEmpresa.reduce((s, e) => s + e.despesas, 0);
  const totalEbitda      = multiEmpresa.reduce((s, e) => s + e.ebitda, 0);

  return (
    <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5">
      <h4 className="text-xs font-black mb-6 uppercase tracking-widest text-slate-400">
        Consolidado Multi-Empresa (Jun/25)
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left pb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Unidade
              </th>
              <th className="text-right pb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Faturamento
              </th>
              <th className="text-right pb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Despesas
              </th>
              <th className="text-right pb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                EBITDA
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {multiEmpresa.map((empresa, i) => {
              const margem = ((empresa.ebitda / empresa.faturamento) * 100).toFixed(1);
              return (
                <tr key={empresa.nome} className="hover:bg-white/3 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {i === 0 && (
                        <span className="text-[9px] font-black uppercase bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                          Matriz
                        </span>
                      )}
                      <span className={`font-bold ${i === 0 ? 'text-white' : 'text-slate-300'}`}>
                        {empresa.nome}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right font-bold text-white">
                    {brl(empresa.faturamento)}
                  </td>
                  <td className="py-3 text-right text-rose-400 font-medium">
                    {brl(empresa.despesas)}
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-emerald-400 font-bold">{brl(empresa.ebitda)}</span>
                    <span className="text-[10px] text-slate-500 ml-1">({margem}%)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-white/10">
              <td className="pt-3 text-xs font-black text-slate-300 uppercase">Total Grupo</td>
              <td className="pt-3 text-right font-black text-white">{brl(totalFaturamento)}</td>
              <td className="pt-3 text-right font-black text-rose-400">{brl(totalDespesas)}</td>
              <td className="pt-3 text-right font-black text-emerald-400">{brl(totalEbitda)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
