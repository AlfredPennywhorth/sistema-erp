import React, { useState, useCallback } from 'react';
import { BarChart3, Search, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ContabilidadeAPI } from '../../lib/contabilidade';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

export default function DRE() {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-01-01`;
  const lastDay = today.toISOString().slice(0, 10);

  const [dataInicio, setDataInicio] = useState(firstDay);
  const [dataFim, setDataFim] = useState(lastDay);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDRE = useCallback(async () => {
    if (!dataInicio || !dataFim) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ContabilidadeAPI.getDRE(dataInicio, dataFim);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erro ao carregar DRE.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  const receitas = data?.itens?.filter((i) => i.tipo === 'RECEITA') ?? [];
  const despesas = data?.itens?.filter((i) => i.tipo === 'DESPESA') ?? [];

  const lucro = data?.resultado_liquido ?? 0;
  const isLucro = lucro >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-500/10 rounded-2xl">
          <BarChart3 className="text-emerald-400" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">DRE</h1>
          <p className="text-sm text-slate-400">Demonstração do Resultado do Exercício</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
            />
          </div>
          <button
            onClick={fetchDRE}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Calculando...' : 'Gerar DRE'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Cards de Resultado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Receitas</p>
              </div>
              <p className="text-2xl font-black text-emerald-400">{fmt(data.total_receitas)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={16} className="text-red-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Despesas</p>
              </div>
              <p className="text-2xl font-black text-red-400">{fmt(data.total_despesas)}</p>
            </div>
            <div className={`rounded-2xl p-5 border ${isLucro ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Minus size={16} className={isLucro ? 'text-emerald-400' : 'text-red-400'} />
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  {isLucro ? 'Lucro Líquido' : 'Prejuízo Líquido'}
                </p>
              </div>
              <p className={`text-2xl font-black ${isLucro ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(Math.abs(lucro))}
              </p>
            </div>
          </div>

          {/* Receitas */}
          <DRESection
            title="Receitas"
            itens={receitas}
            total={data.total_receitas}
            color="emerald"
            icon={<TrendingUp size={16} />}
          />

          {/* Despesas */}
          <DRESection
            title="Despesas"
            itens={despesas}
            total={data.total_despesas}
            color="red"
            icon={<TrendingDown size={16} />}
            valorNegativo
          />

          <p className="text-xs text-slate-500 text-center">
            Período: {dataInicio} a {dataFim} • Regime de Competência
          </p>
        </>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <BarChart3 size={40} className="opacity-30" />
          <p className="text-sm">Selecione o período e clique em <strong>Gerar DRE</strong></p>
        </div>
      )}
    </div>
  );
}

function DRESection({ title, itens, total, color, icon, valorNegativo }) {
  const colorMap = {
    emerald: { header: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', total: 'text-emerald-400' },
    red: { header: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', total: 'text-red-400' },
  };
  const c = colorMap[color] ?? colorMap.emerald;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className={`flex items-center gap-2 ${c.header}`}>
          {icon}
          <span className="font-black text-sm uppercase tracking-wider">{title}</span>
        </div>
        <span className={`font-black text-sm ${c.total}`}>{fmt(total)}</span>
      </div>
      {itens.length === 0 ? (
        <p className="text-center py-6 text-slate-500 text-sm">Nenhuma {title.toLowerCase()} no período.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {itens.map((item) => (
              <tr key={item.conta_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-5 py-3 font-mono text-slate-400 text-xs w-32">{item.codigo}</td>
                <td className="px-3 py-3 text-white">{item.nome}</td>
                <td className={`px-5 py-3 text-right font-mono text-xs font-bold ${c.header}`}>
                  {valorNegativo ? fmt(Math.abs(item.valor)) : fmt(item.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
