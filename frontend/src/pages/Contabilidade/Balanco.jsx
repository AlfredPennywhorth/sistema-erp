import React, { useState, useCallback } from 'react';
import { Scale, Search, Loader2, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { ContabilidadeAPI } from '../../lib/contabilidade';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const TIPO_GROUPS = {
  ATIVO: { label: 'Ativo', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
  PASSIVO: { label: 'Passivo', color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5' },
  PATRIMONIO: { label: 'Patrimônio Líquido', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
};

function BalancoNode({ item, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = item.filhos && item.filhos.length > 0;
  const indent = depth * 16;

  return (
    <>
      <tr
        className={`border-b border-white/5 ${hasChildren ? 'cursor-pointer hover:bg-white/3' : 'hover:bg-white/2'} transition-colors`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + indent}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              expanded ? <ChevronDown size={14} className="text-slate-500 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
            ) : (
              <span className="w-3.5 flex-shrink-0" />
            )}
            <span className="font-mono text-slate-400 text-xs w-24 flex-shrink-0">{item.codigo}</span>
            <span className={`text-sm ${hasChildren ? 'font-bold text-white' : 'text-slate-200'}`}>
              {item.nome}
            </span>
          </div>
        </td>
        <td className={`px-5 py-2.5 text-right font-mono text-sm ${hasChildren ? 'font-bold text-white' : 'text-slate-300'}`}>
          {fmt(item.saldo)}
        </td>
      </tr>
      {expanded && hasChildren && item.filhos.map((filho) => (
        <BalancoNode key={filho.conta_id} item={filho} depth={depth + 1} />
      ))}
    </>
  );
}

function BalancoSection({ title, itens, total, grupo }) {
  const { color, border, bg, label } = TIPO_GROUPS[grupo] ?? TIPO_GROUPS.ATIVO;

  return (
    <div className={`rounded-2xl border ${border} ${bg} overflow-hidden`}>
      <div className={`flex items-center justify-between px-5 py-4 border-b border-white/10`}>
        <span className={`font-black text-sm uppercase tracking-wider ${color}`}>{label}</span>
        <span className={`font-black text-base ${color}`}>{fmt(total)}</span>
      </div>
      {itens.length === 0 ? (
        <p className="text-center py-6 text-slate-500 text-sm">Sem movimentações.</p>
      ) : (
        <table className="w-full">
          <tbody>
            {itens.map((item) => (
              <BalancoNode key={item.conta_id} item={item} depth={0} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Balanco() {
  const today = new Date().toISOString().slice(0, 10);

  const [dataBase, setDataBase] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBalanco = useCallback(async () => {
    if (!dataBase) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ContabilidadeAPI.getBalanco(dataBase);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erro ao carregar balanço patrimonial.');
    } finally {
      setLoading(false);
    }
  }, [dataBase]);

  const patrimonioTotal = data ? data.total_passivo + data.total_patrimonio : 0;
  const isEquilibrado = data && Math.abs(data.total_ativo - patrimonioTotal) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-500/10 rounded-2xl">
          <Scale className="text-purple-400" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Balanço Patrimonial</h1>
          <p className="text-sm text-slate-400">Posição de Ativo, Passivo e Patrimônio Líquido</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data Base</label>
            <input
              type="date"
              value={dataBase}
              onChange={(e) => setDataBase(e.target.value)}
              className="bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
            />
          </div>
          <button
            onClick={fetchBalanco}
            disabled={loading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Calculando...' : 'Gerar Balanço'}
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
          {/* Totais resumidos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Ativo Total</p>
              <p className="text-xl font-black text-blue-400">{fmt(data.total_ativo)}</p>
            </div>
            <div className="bg-orange-500/10 rounded-2xl p-4 border border-orange-500/20 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Passivo Total</p>
              <p className="text-xl font-black text-orange-400">{fmt(data.total_passivo)}</p>
            </div>
            <div className="bg-purple-500/10 rounded-2xl p-4 border border-purple-500/20 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Patrimônio Líquido</p>
              <p className="text-xl font-black text-purple-400">{fmt(data.total_patrimonio)}</p>
            </div>
            <div className={`rounded-2xl p-4 border text-center ${isEquilibrado ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Equilíbrio</p>
              <p className={`text-lg font-black ${isEquilibrado ? 'text-emerald-400' : 'text-red-400'}`}>
                {isEquilibrado ? '✓ Equilibrado' : '✗ Desequilibrado'}
              </p>
              {!isEquilibrado && (
                <p className="text-xs text-red-400 mt-0.5">
                  Δ {fmt(Math.abs(data.total_ativo - patrimonioTotal))}
                </p>
              )}
            </div>
          </div>

          {/* Equação contábil */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Equação Patrimonial</p>
            <div className="flex items-center justify-center gap-4 flex-wrap text-sm">
              <span className="text-blue-400 font-black">ATIVO {fmt(data.total_ativo)}</span>
              <span className="text-slate-500">=</span>
              <span className="text-orange-400 font-bold">PASSIVO {fmt(data.total_passivo)}</span>
              <span className="text-slate-500">+</span>
              <span className="text-purple-400 font-bold">PL {fmt(data.total_patrimonio)}</span>
            </div>
          </div>

          {/* Seções hierárquicas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ativo */}
            <BalancoSection title="Ativo" itens={data.ativo} total={data.total_ativo} grupo="ATIVO" />

            {/* Passivo + PL */}
            <div className="space-y-4">
              <BalancoSection title="Passivo" itens={data.passivo} total={data.total_passivo} grupo="PASSIVO" />
              <BalancoSection title="Patrimônio Líquido" itens={data.patrimonio} total={data.total_patrimonio} grupo="PATRIMONIO" />
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Data-base: {dataBase} · Regime de Competência
          </p>
        </>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <Scale size={40} className="opacity-30" />
          <p className="text-sm">Selecione a data-base e clique em <strong>Gerar Balanço</strong></p>
        </div>
      )}
    </div>
  );
}
