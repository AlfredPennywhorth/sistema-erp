import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle,
  TrendingDown, TrendingUp, Wallet, BookOpen, Landmark, BarChart3,
  Settings2, LayoutDashboard, ClipboardList, FileText, PlusCircle,
  XCircle, Clock
} from 'lucide-react';
import { api, setTenantId } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

function StatCard({ label, value, icon, color = 'brand', formatter }) {
  const colorMap = {
    brand: 'bg-brand-primary/10 text-brand-primary',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    rose: 'bg-rose-500/10 text-rose-500',
    amber: 'bg-amber-500/10 text-amber-500',
    blue: 'bg-blue-500/10 text-blue-500',
  };
  const formattedValue = formatter ? formatter(value) : value;
  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-black text-slate-800 dark:text-white">{formattedValue}</p>
      </div>
    </div>
  );
}

function ChecklistItem({ item }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      item.ok
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-amber-500/20 bg-amber-500/5'
    }`}>
      {item.ok
        ? <CheckCircle size={16} className="text-emerald-500 shrink-0" />
        : <AlertTriangle size={16} className="text-amber-500 shrink-0" />
      }
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{item.descricao}</span>
      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
        item.ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
      }`}>
        {item.valor}
      </span>
    </div>
  );
}

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

export default function EmpresaDetalhe() {
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const { setActiveTenant } = useAuth();

  const [resumo, setResumo] = useState(null);
  const [fechamento, setFechamento] = useState(null);
  const [honorarios, setHonorarios] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [switching, setSwitching] = useState(false);

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const [resumoRes, fechamentoRes, honorariosRes, empresasRes] = await Promise.all([
        api.get(`/contador/empresas/${empresaId}/resumo`),
        api.get(`/contador/empresas/${empresaId}/fechamento`),
        api.get('/contador/honorarios'),
        api.get('/contador/empresas'),
      ]);
      setResumo(resumoRes.data);
      setFechamento(fechamentoRes.data);
      setHonorarios((honorariosRes.data || []).filter(h => h.empresa_id === empresaId));
      const found = (empresasRes.data || []).find(e => e.id === empresaId);
      setEmpresa(found || null);
    } catch (err) {
      setError('Não foi possível carregar os dados desta empresa.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEntrar = async () => {
    if (!empresaId) return;
    setSwitching(true);
    try {
      await api.post('/contador/switch-context', { empresa_id: empresaId });
      await setActiveTenant(String(empresaId));
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erro ao entrar na empresa.');
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
        <span className="text-sm font-medium">Carregando dados da empresa...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-rose-500">
        <AlertTriangle size={32} />
        <p className="text-sm font-bold">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const regimeLabels = {
    SIMPLES_NACIONAL: 'Simples Nacional',
    LUCRO_PRESUMIDO: 'Lucro Presumido',
    LUCRO_REAL: 'Lucro Real',
    MEI: 'MEI',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/contador"
          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            {empresa?.nome_fantasia || empresa?.razao_social || 'Empresa'}
          </h1>
          {empresa?.nome_fantasia && (
            <p className="text-xs text-slate-400 mt-0.5">{empresa.razao_social}</p>
          )}
          <p className="text-xs text-slate-500">
            {empresa?.cnpj ? `CNPJ: ${empresa.cnpj}` : ''}
            {empresa?.regime_tributario ? ` · ${regimeLabels[empresa.regime_tributario] || empresa.regime_tributario}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleEntrar}
            disabled={switching}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-brand-primary/20"
          >
            {switching ? <RefreshCw size={14} className="animate-spin" /> : <Building2 size={14} />}
            {switching ? 'Entrando...' : 'Entrar na Empresa'}
          </button>
        </div>
      </div>

      {/* Resumo Financeiro */}
      {resumo && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Resumo Financeiro</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            <StatCard
              label="Saldo Bancário"
              value={resumo.saldo_bancario_total}
              icon={<Landmark size={18} />}
              color="brand"
              formatter={formatBRL}
            />
            <StatCard
              label="Contas a Pagar"
              value={resumo.contas_a_pagar}
              icon={<TrendingDown size={18} />}
              color="rose"
              formatter={formatBRL}
            />
            <StatCard
              label="Contas a Receber"
              value={resumo.contas_a_receber}
              icon={<TrendingUp size={18} />}
              color="emerald"
              formatter={formatBRL}
            />
            <StatCard
              label="Regras Contábeis"
              value={resumo.total_regras_contabeis}
              icon={<BookOpen size={18} />}
              color="blue"
            />
            <StatCard
              label="Lançamentos Abertos"
              value={resumo.lancamentos_abertos}
              icon={<FileText size={18} />}
              color={resumo.lancamentos_abertos > 0 ? 'amber' : 'brand'}
            />
            <StatCard
              label="Títulos Vencidos"
              value={resumo.lancamentos_vencidos}
              icon={<Clock size={18} />}
              color={resumo.lancamentos_vencidos > 0 ? 'rose' : 'brand'}
            />
          </div>

          {/* Fluxo do Mês */}
          <div className="mt-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Fluxo do Mês Corrente</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Entradas</p>
                <p className="text-lg font-black text-emerald-500">{formatBRL(resumo.fluxo_mes_corrente.entradas)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Saídas</p>
                <p className="text-lg font-black text-rose-500">{formatBRL(resumo.fluxo_mes_corrente.saidas)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Saldo do Mês</p>
                <p className={`text-lg font-black ${resumo.fluxo_mes_corrente.saldo >= 0 ? 'text-brand-primary' : 'text-rose-500'}`}>
                  {formatBRL(resumo.fluxo_mes_corrente.saldo)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist de Fechamento */}
        {fechamento && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                Checklist de Fechamento
              </h2>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                fechamento.pronto_para_fechar
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-amber-500/10 text-amber-600'
              }`}>
                {fechamento.pronto_para_fechar ? 'Pronto' : `${fechamento.itens_pendentes} pendente(s)`}
              </span>
            </div>
            <div className="space-y-2">
              {fechamento.checklist.map((item) => (
                <ChecklistItem key={item.item} item={item} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Atalhos e Honorários */}
        <div className="space-y-6">
          {/* Atalhos */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Acesso Rápido</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Dashboard', icon: <LayoutDashboard size={16} />, path: '/dashboard' },
                { label: 'Financeiro', icon: <Wallet size={16} />, path: '/financeiro' },
                { label: 'Regras Contábeis', icon: <BookOpen size={16} />, path: '/financeiro/regras-contabeis' },
                { label: 'Relatórios', icon: <BarChart3 size={16} />, path: '/relatorios' },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={async () => {
                    await api.post('/contador/switch-context', { empresa_id: empresaId });
                    await setActiveTenant(String(empresaId));
                    navigate(link.path);
                  }}
                  className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 dark:bg-white/5 hover:bg-brand-primary/10 dark:hover:bg-brand-primary/10 border border-slate-200 dark:border-white/5 hover:border-brand-primary/20 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-brand-primary transition-all"
                >
                  <span className="text-slate-400">{link.icon}</span>
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Honorários */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Honorários</h2>
            {honorarios.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 text-sm">
                <ClipboardList size={16} />
                Nenhum honorário registrado para esta empresa.
              </div>
            ) : (
              <div className="space-y-2">
                {honorarios.slice(0, 5).map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        {formatBRL(h.valor)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Venc: {new Date(h.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      h.status_pagamento === 'PAGO'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : h.status_pagamento === 'ATRASADO'
                        ? 'bg-rose-500/10 text-rose-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {h.status_pagamento}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
