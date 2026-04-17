import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, Search, Download, TrendingUp, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import { ContabilidadeAPI } from '../../lib/contabilidade';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const TIPO_LABEL = {
  ATIVO: 'Ativo',
  PASSIVO: 'Passivo',
  PATRIMONIO: 'Patrimônio',
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
};

const TIPO_COLOR = {
  ATIVO: 'text-blue-400',
  PASSIVO: 'text-orange-400',
  PATRIMONIO: 'text-purple-400',
  RECEITA: 'text-emerald-400',
  DESPESA: 'text-red-400',
};

export default function Balancete() {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = today.toISOString().slice(0, 10);

  const [dataInicio, setDataInicio] = useState(firstDay);
  const [dataFim, setDataFim] = useState(lastDay);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchBalancete = useCallback(async () => {
    if (!dataInicio || !dataFim) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ContabilidadeAPI.getBalancete(dataInicio, dataFim);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erro ao carregar balancete.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  const filtered = data?.itens?.filter(
    (i) =>
      !search ||
      i.nome.toLowerCase().includes(search.toLowerCase()) ||
      i.codigo.includes(search)
  ) ?? [];

  const isDesequilibrado = data && Math.abs(data.total_debitos - data.total_creditos) > 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-2xl">
            <FileSpreadsheet className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Balancete de Verificação</h1>
            <p className="text-sm text-slate-400">Conferência de saldos por conta contábil</p>
          </div>
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
            onClick={fetchBalancete}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Buscando...' : 'Gerar Balancete'}
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
          {/* Totais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/5">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Total Débitos</p>
              <p className="text-2xl font-black text-blue-400">{fmt(data.total_debitos)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/5">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Total Créditos</p>
              <p className="text-2xl font-black text-emerald-400">{fmt(data.total_creditos)}</p>
            </div>
            <div className={`bg-slate-800/50 rounded-2xl p-5 border ${isDesequilibrado ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'}`}>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Diferença</p>
              <p className={`text-2xl font-black ${isDesequilibrado ? 'text-red-400' : 'text-slate-400'}`}>
                {fmt(Math.abs(data.total_debitos - data.total_creditos))}
              </p>
              {isDesequilibrado && (
                <p className="text-xs text-red-400 mt-1 font-semibold">⚠ Desequilíbrio detectado</p>
              )}
            </div>
          </div>

          {/* Busca */}
          <div className="flex items-center gap-3 bg-slate-800/50 border border-white/5 rounded-xl px-4 py-2.5">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código ou nome da conta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-slate-500"
            />
          </div>

          {/* Tabela */}
          <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Código</th>
                  <th className="text-left px-5 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Conta</th>
                  <th className="text-left px-3 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Tipo</th>
                  <th className="text-right px-5 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Saldo Anterior</th>
                  <th className="text-right px-5 py-3.5 text-blue-400 font-semibold text-xs uppercase tracking-wider">Débitos</th>
                  <th className="text-right px-5 py-3.5 text-emerald-400 font-semibold text-xs uppercase tracking-wider">Créditos</th>
                  <th className="text-right px-5 py-3.5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Saldo Atual</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      {data.itens.length === 0 ? 'Nenhuma movimentação no período.' : 'Nenhuma conta encontrada para a busca.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.conta_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-300 text-xs">{item.codigo}</td>
                      <td className="px-5 py-3 text-white font-medium">{item.nome}</td>
                      <td className="px-3 py-3">
                        <span className={`text-xs font-bold ${TIPO_COLOR[item.tipo] ?? 'text-slate-400'}`}>
                          {TIPO_LABEL[item.tipo] ?? item.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400 font-mono text-xs">
                        {fmt(item.saldo_anterior)}
                      </td>
                      <td className="px-5 py-3 text-right text-blue-400 font-mono text-xs">
                        {item.total_debitos > 0 ? fmt(item.total_debitos) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-400 font-mono text-xs">
                        {item.total_creditos > 0 ? fmt(item.total_creditos) : '—'}
                      </td>
                      <td className={`px-5 py-3 text-right font-mono text-xs font-bold ${item.saldo_atual >= 0 ? 'text-white' : 'text-red-400'}`}>
                        {fmt(item.saldo_atual)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500 text-center">
            {filtered.length} conta(s) • Período: {dataInicio} a {dataFim}
          </p>
        </>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <FileSpreadsheet size={40} className="opacity-30" />
          <p className="text-sm">Selecione o período e clique em <strong>Gerar Balancete</strong></p>
        </div>
      )}
    </div>
  );
}
