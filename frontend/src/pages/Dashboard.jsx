import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Activity,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  RefreshCcw
} from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { TERMS } from '../constants/terms';
import { CHART_COLORS } from '../constants/chartColors';


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm font-black" style={{ color: entry.color }}>
            {entry.name}: R$ {Number(entry.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { activeTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [fluxoData, setFluxoData] = useState([]);
  const [dataFallback, setDataFallback] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.get('/financeiro/dashboard-stats'),
        api.get('/team/audit').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      
      // Construir dados do gráfico a partir dos stats
      if (statsRes.data?.fluxo_mensal) {
        setFluxoData(statsRes.data.fluxo_mensal);
        setDataFallback(false);
      } else {
        setDataFallback(true);
      }

      setRecentLogs(Array.isArray(logsRes.data) ? logsRes.data.slice(0, 5) : []);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
      setFluxoData([]);
      setDataFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const handler = () => fetchDashboardData();
    window.addEventListener('financeiro-updated', handler);
    return () => window.removeEventListener('financeiro-updated', handler);
  }, []);

  const saldoBancario = stats?.saldo_bancario ?? 0;
  const contasReceber = stats?.contas_a_receber ?? 0;
  const contasPagar = stats?.contas_a_pagar ?? 0;
  const liquidez = contasPagar > 0 ? Math.min(100, Math.round((contasReceber / contasPagar) * 100)) : 100;

  const statCards = [
    { 
      label: TERMS.financeiro.saldoEmCaixa, 
      value: `R$ ${Number(saldoBancario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      badge: TERMS.financeiro.disponivel, 
      color: 'indigo',
      icon: <Wallet size={20} className="text-indigo-500" />,
    },
    { 
      label: TERMS.financeiro.aReceberAberto, 
      value: `R$ ${Number(contasReceber).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      badge: TERMS.financeiro.previsao,
      color: 'emerald',
      icon: <ArrowUpCircle size={20} className="text-emerald-500" />,
    },
    { 
      label: TERMS.financeiro.aPagarAberto, 
      value: `R$ ${Number(contasPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      badge: TERMS.financeiro.compromissos,
      color: 'rose',
      icon: <ArrowDownCircle size={20} className="text-rose-500" />,
    },
    { 
      label: TERMS.financeiro.indiceLiquidez, 
      value: `${liquidez}%`, 
      badge: liquidez >= 100 ? TERMS.financeiro.liquidezSaudavel : TERMS.financeiro.liquidezAtencao,
      color: liquidez >= 100 ? 'emerald' : 'amber',
      icon: <Activity size={20} className={liquidez >= 100 ? "text-emerald-500" : "text-amber-500"} />,
    }
  ];

  const receitasDespesasMock = fluxoData.slice(-6).map(d => ({
    mes: d.mes,
    receitas: d.entradas,
    despesas: d.saidas,
  }));

  const liquidezRadial = [{ name: 'Liquidez', value: liquidez, fill: liquidez >= 100 ? '#10b981' : '#f59e0b' }];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold animate-pulse">{TERMS.dashboard.carregandoDados}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black text-slate-800 dark:text-white tracking-tight"
          >
            {TERMS.dashboard.tituloPainel}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 dark:text-slate-400 font-medium"
          >
            Olá, {activeTenant?.razao_social || 'seja bem-vindo'}. {TERMS.dashboard.subtituloBoasVindas}
          </motion.p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-brand-primary hover:text-white transition-all group"
        >
          <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
          {TERMS.dashboard.atualizar}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="glass-card p-6 flex flex-col gap-4 border border-white/10 dark:border-white/5 hover:shadow-xl transition-all group"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full
                ${stat.color === 'emerald' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' : ''}
                ${stat.color === 'rose' ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' : ''}
                ${stat.color === 'indigo' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400' : ''}
                ${stat.color === 'amber' ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' : ''}
              `}>
                {stat.badge}
              </span>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Gráfico 1: Fluxo de Caixa — AreaChart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 glass-card p-6 border border-white/10 dark:border-white/5"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-primary" />
              {TERMS.financeiro.fluxoCaixa12Meses}
            </h2>
            {dataFallback && (
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                {TERMS.dashboard.dadosExemplo}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={fluxoData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.entradas} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.entradas} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.saidas} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.saidas} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Area type="monotone" dataKey="entradas" name={TERMS.graficos.legendaEntradas} stroke={CHART_COLORS.entradas} strokeWidth={2.5} fill="url(#gradEntradas)" dot={false} />
              <Area type="monotone" dataKey="saidas" name={TERMS.graficos.legendaSaidas} stroke={CHART_COLORS.saidas} strokeWidth={2} fill="url(#gradSaidas)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico 3: Indicador de Liquidez — RadialBarChart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 border border-white/10 dark:border-white/5 flex flex-col"
        >
          <h2 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Activity size={18} className="text-amber-500" />
            {TERMS.financeiro.indiceLiquidez}
          </h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart
                innerRadius="60%"
                outerRadius="100%"
                data={liquidezRadial}
                startAngle={210}
                endAngle={-30}
              >
                <RadialBar
                  minAngle={5}
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
                  className="fill-slate-800 dark:fill-white"
                  style={{ fontSize: '28px', fontWeight: 900, fill: liquidez >= 100 ? '#10b981' : '#f59e0b' }}
                >
                  {liquidez}%
                </text>
                <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: '10px', fontWeight: 700, fill: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  {liquidez >= 100 ? TERMS.financeiro.liquidezSaudavel : TERMS.financeiro.liquidezAtencao}
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-3 w-full">
              <div className="bg-emerald-500/10 rounded-2xl p-3 text-center">
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{TERMS.ui.aReceber}</p>
                <p className="text-sm font-black text-slate-800 dark:text-white mt-1">R$ {contasReceber.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-rose-500/10 rounded-2xl p-3 text-center">
                <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest">{TERMS.ui.aPagar}</p>
                <p className="text-sm font-black text-slate-800 dark:text-white mt-1">R$ {contasPagar.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gráfico 2: Receitas vs Despesas + Auditoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="lg:col-span-2 glass-card p-6 border border-white/10 dark:border-white/5"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-primary" />
              {TERMS.graficos.receitasVsDespesas}
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={receitasDespesasMock} barGap={6} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Bar dataKey="receitas" name={TERMS.graficos.legendaReceitas} fill={CHART_COLORS.receitas} radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="despesas" name={TERMS.graficos.legendaDespesas} fill={CHART_COLORS.despesas} radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Auditoria Recente */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card p-6 border border-white/10 dark:border-white/5"
        >
          <h2 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-500" />
            {TERMS.compliance.auditoriaRecente}
          </h2>
          <div className="space-y-5">
            {recentLogs.length === 0 ? (
              <p className="text-slate-400 text-sm italic py-4 text-center">{TERMS.dashboard.nenhumaAtividade}</p>
            ) : recentLogs.map((log, i) => (
              <div key={log.id} className="flex gap-3 group">
                <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-400 transition-colors">
                    {log.acao} em {log.tabela_afetada?.replace('_', ' ')}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase font-black tracking-widest">
                    {new Date(log.criado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-indigo-500 hover:text-white transition-all">
            {TERMS.dashboard.verLogCompleto}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
