import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  Landmark,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const TABS = [
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: <BarChart3 size={16} /> },
  { id: 'contas', label: 'Contas a Pagar/Receber', icon: <TrendingDown size={16} /> },
  { id: 'pendencias', label: 'Pendências Contábeis', icon: <AlertTriangle size={16} /> },
];

// ── Fluxo de Caixa ──────────────────────────────────────────────────────────

function FluxoCaixa() {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().split('T')[0];

  const [dataInicio, setDataInicio] = useState(firstDay);
  const [dataFim, setDataFim] = useState(todayStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/relatorios/fluxo-caixa', {
        params: { data_inicio: dataInicio, data_fim: dataFim },
      });
      setData(res.data);
    } catch (err) {
      setError('Erro ao carregar dados de fluxo de caixa.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data Início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-primary/40"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data Fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-primary/40"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
        >
          {loading ? <RefreshCw size={13} className="animate-spin" /> : <Calendar size={13} />}
          Aplicar
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
          <RefreshCw size={20} className="animate-spin" />
          <span className="text-sm font-medium">Carregando...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Totais */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Entradas', value: data.totais.entradas, color: 'emerald' },
              { label: 'Total Saídas', value: data.totais.saidas, color: 'rose' },
              { label: 'Saldo Líquido', value: data.totais.saldo_liquido, color: data.totais.saldo_liquido >= 0 ? 'brand' : 'rose' },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 text-center">
                <p className="text-xs text-slate-400 font-medium mb-1">{item.label}</p>
                <p className={`text-xl font-black ${
                  item.color === 'emerald' ? 'text-emerald-500' :
                  item.color === 'rose' ? 'text-rose-500' :
                  item.color === 'brand' ? 'text-brand-primary' : 'text-rose-500'
                }`}>
                  {formatBRL(item.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Tabela mensal */}
          {data.meses.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhuma movimentação liquidada no período selecionado.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40">
                    <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês</th>
                    <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entradas</th>
                    <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saídas</th>
                    <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Mês</th>
                    <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.meses.map((m, i) => (
                    <tr key={m.mes} className={`border-b border-slate-100 dark:border-white/5 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'}`}>
                      <td className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">{m.mes}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatBRL(m.entradas)}</td>
                      <td className="px-5 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">{formatBRL(m.saidas)}</td>
                      <td className={`px-5 py-3 text-right font-bold ${m.saldo_mes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatBRL(m.saldo_mes)}
                      </td>
                      <td className={`px-5 py-3 text-right font-black ${m.saldo_acumulado >= 0 ? 'text-brand-primary' : 'text-rose-500'}`}>
                        {formatBRL(m.saldo_acumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Contas a Pagar / Receber ─────────────────────────────────────────────────

function ContasPagarReceber() {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = today.toISOString().split('T')[0];

  const [dataInicio, setDataInicio] = useState(firstDay);
  const [dataFim, setDataFim] = useState(todayStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('pagar');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/relatorios/contas-pagar-receber', {
        params: { data_inicio: dataInicio, data_fim: dataFim },
      });
      setData(res.data);
    } catch (err) {
      setError('Erro ao carregar dados de contas a pagar/receber.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const current = data ? data[tab] : null;
  const statusColor = {
    ABERTO: 'bg-amber-500/10 text-amber-600',
    PAGO: 'bg-emerald-500/10 text-emerald-600',
    PARCIAL: 'bg-blue-500/10 text-blue-600',
    CANCELADO: 'bg-slate-200 text-slate-500',
    CONCILIADO: 'bg-brand-primary/10 text-brand-primary',
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Período Início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-primary/40"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Período Fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-primary/40"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
        >
          {loading ? <RefreshCw size={13} className="animate-spin" /> : <Calendar size={13} />}
          Aplicar
        </button>
      </div>

      {/* Sub-tabs pagar/receber */}
      {data && !loading && (
        <div className="flex gap-2">
          {['pagar', 'receber'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
                tab === t
                  ? t === 'pagar'
                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 border border-transparent hover:border-slate-200 dark:hover:border-white/10'
              }`}
            >
              {t === 'pagar' ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
              {t === 'pagar' ? 'A Pagar' : 'A Receber'}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
          <RefreshCw size={20} className="animate-spin" />
          <span className="text-sm font-medium">Carregando...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {current && !loading && (
        <>
          {/* Totais */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Em Aberto', value: current.em_aberto, color: 'amber' },
              { label: 'Vencidos', value: current.vencidos, color: 'rose' },
              { label: `Liquidados no Período`, value: current.liquidados_no_periodo, color: 'emerald' },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 text-center">
                <p className="text-xs text-slate-400 font-medium mb-1">{item.label}</p>
                <p className={`text-xl font-black ${
                  item.color === 'amber' ? 'text-amber-500' :
                  item.color === 'rose' ? 'text-rose-500' : 'text-emerald-500'
                }`}>
                  {formatBRL(item.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Próximos vencimentos */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Próximos Vencimentos em Aberto
              </p>
            </div>
            {current.proximos_vencimentos.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Nenhum título em aberto.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40">
                    <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                    <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                    <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                    <th className="text-center px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {current.proximos_vencimentos.map((item, i) => (
                    <tr key={item.id} className={`border-b border-slate-100 dark:border-white/5 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'}`}>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-200 font-medium truncate max-w-[200px]">{item.descricao}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-800 dark:text-white">{formatBRL(item.valor)}</td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${statusColor[item.status] || 'bg-slate-100 text-slate-500'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Pendências Contábeis ─────────────────────────────────────────────────────

function PendenciasContabeis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/relatorios/pendencias');
      setData(res.data);
    } catch (err) {
      setError('Erro ao carregar pendências.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
        <RefreshCw size={20} className="animate-spin" />
        <span className="text-sm font-medium">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm">
        <AlertTriangle size={16} />
        {error}
      </div>
    );
  }

  if (!data) return null;

  const indicadores = [
    {
      label: 'Lançamentos em Aberto',
      value: data.lancamentos_abertos,
      ok: data.lancamentos_abertos === 0,
      icon: <FileText size={16} />,
      desc: 'Títulos financeiros ainda não liquidados',
    },
    {
      label: 'Títulos Vencidos',
      value: data.lancamentos_vencidos,
      ok: data.lancamentos_vencidos === 0,
      icon: <Clock size={16} />,
      desc: 'Títulos com vencimento passado e não pagos',
    },
    {
      label: 'Contas sem Vínculo Contábil',
      value: data.contas_sem_vinculo_contabil,
      ok: data.contas_sem_vinculo_contabil === 0,
      icon: <Landmark size={16} />,
      desc: 'Contas bancárias sem conta do plano de contas vinculada',
    },
    {
      label: 'Regras Contábeis',
      value: data.total_regras_contabeis,
      ok: data.total_regras_contabeis > 0,
      icon: <BarChart3 size={16} />,
      desc: 'Total de regras contábeis configuradas',
    },
    {
      label: 'Parcelas de Empréstimo Vencidas',
      value: data.parcelas_emprestimo_vencidas,
      ok: data.parcelas_emprestimo_vencidas === 0,
      icon: <AlertTriangle size={16} />,
      desc: 'Parcelas de empréstimo pendentes com vencimento passado',
    },
    {
      label: 'Empréstimos Ativos',
      value: data.emprestimos_ativos,
      ok: true,
      icon: <TrendingDown size={16} />,
      desc: 'Empréstimos em andamento (informativo)',
    },
    {
      label: 'Aplicações Financeiras Ativas',
      value: data.aplicacoes_financeiras_ativas,
      ok: true,
      icon: <TrendingUp size={16} />,
      desc: 'Aplicações ativas (informativo)',
    },
  ];

  const totalPendentes = indicadores.filter((i) => !i.ok).length;

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${
        totalPendentes === 0
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-amber-500/5 border-amber-500/20'
      }`}>
        {totalPendentes === 0
          ? <CheckCircle size={20} className="text-emerald-500" />
          : <AlertTriangle size={20} className="text-amber-500" />
        }
        <div>
          <p className={`text-sm font-bold ${totalPendentes === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {totalPendentes === 0
              ? 'Nenhuma pendência crítica identificada.'
              : `${totalPendentes} indicador(es) requerem atenção.`
            }
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Baseado nos dados do período atual</p>
        </div>
        <button
          onClick={fetchData}
          className="ml-auto p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Indicadores */}
      <div className="space-y-3">
        {indicadores.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${
              item.ok
                ? 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/5'
                : 'bg-amber-500/5 border-amber-500/20'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              item.ok ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : 'bg-amber-500/10 text-amber-500'
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-white">{item.label}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black ${item.ok ? 'text-slate-600 dark:text-slate-300' : 'text-amber-600'}`}>
                {item.value}
              </span>
              {item.ok
                ? <CheckCircle size={16} className="text-emerald-500" />
                : <AlertTriangle size={16} className="text-amber-500" />
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Reports principal ────────────────────────────────────────────────────────

const Reports = () => {
  const { activeTenant } = useAuth();
  const [activeTab, setActiveTab] = useState('fluxo');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-black text-slate-800 dark:text-white tracking-tight"
        >
          Relatórios
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 dark:text-slate-400 font-medium mt-1"
        >
          Análises financeiras e contábeis para {activeTenant?.razao_social || 'a empresa'}.
        </motion.p>
      </div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 mb-7 flex-wrap"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                : 'bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:border-brand-primary/30 hover:text-brand-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'fluxo' && <FluxoCaixa />}
        {activeTab === 'contas' && <ContasPagarReceber />}
        {activeTab === 'pendencias' && <PendenciasContabeis />}
      </motion.div>
    </div>
  );
};

export default Reports;

