import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, ArrowRight, AlertTriangle, CheckCircle,
  BookOpen, Landmark, RefreshCw, FileText, Wallet, Search
} from 'lucide-react';
import { api, setTenantId } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

function PendenciasTag({ value, label }) {
  const isOk = value === 0;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
      isOk
        ? 'bg-emerald-500/10 text-emerald-500'
        : 'bg-amber-500/10 text-amber-500'
    }`}>
      {isOk
        ? <CheckCircle size={10} />
        : <AlertTriangle size={10} />
      }
      {value} {label}
    </div>
  );
}

function EmpresaCard({ empresa, onEntrar, onDetalhe }) {
  const [pendencias, setPendencias] = useState(null);
  const [loadingPend, setLoadingPend] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchPendencias() {
      setLoadingPend(true);
      try {
        const res = await api.get(`/contador/empresas/${empresa.id}/pendencias`);
        if (!cancelled) setPendencias(res.data);
      } catch (err) {
        console.error('[Contador] Erro ao carregar pendências:', err);
      } finally {
        if (!cancelled) setLoadingPend(false);
      }
    }
    fetchPendencias();
    return () => { cancelled = true; };
  }, [empresa.id]);

  const regimeLabels = {
    SIMPLES_NACIONAL: 'Simples Nacional',
    LUCRO_PRESUMIDO: 'Lucro Presumido',
    LUCRO_REAL: 'Lucro Real',
    MEI: 'MEI',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:border-brand-primary/30 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="min-w-[44px] h-11 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
          <Building2 size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-slate-800 dark:text-white truncate">
            {empresa.nome_fantasia || empresa.razao_social}
          </h3>
          {empresa.nome_fantasia && (
            <p className="text-[10px] text-slate-400 truncate">{empresa.razao_social}</p>
          )}
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            CNPJ: {empresa.cnpj}
          </p>
        </div>
      </div>

      {/* Regime */}
      <div className="flex items-center gap-2">
        <FileText size={12} className="text-slate-400 shrink-0" />
        <span className="text-[11px] text-slate-500">
          {regimeLabels[empresa.regime_tributario] || empresa.regime_tributario}
        </span>
      </div>

      {/* Pendências */}
      <div className="min-h-[36px]">
        {loadingPend ? (
          <div className="flex items-center gap-2 text-slate-400">
            <RefreshCw size={12} className="animate-spin" />
            <span className="text-[10px]">Verificando pendências...</span>
          </div>
        ) : pendencias ? (
          <div className="flex flex-wrap gap-1.5">
            <PendenciasTag value={pendencias.lancamentos_abertos} label="em aberto" />
            <PendenciasTag value={pendencias.contas_sem_vinculo_contabil} label="s/ contábil" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-500">
              <BookOpen size={10} />
              {pendencias.total_regras_contabeis} regras
            </div>
          </div>
        ) : null}
      </div>

      {/* Ação */}
      <div className="mt-auto flex gap-2">
        <button
          onClick={() => onDetalhe(empresa)}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest py-2.5 rounded-xl transition-colors"
        >
          <FileText size={13} />
          Detalhe
        </button>
        <button
          onClick={() => onEntrar(empresa)}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black uppercase tracking-widest py-2.5 rounded-xl transition-colors shadow-md shadow-brand-primary/20 group"
        >
          Entrar
          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

export default function Contador() {
  const navigate = useNavigate();
  const { setActiveTenant } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [switching, setSwitching] = useState(null);
  const [switchError, setSwitchError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/contador/empresas');
      setEmpresas(res.data || []);
    } catch (err) {
      setError('Não foi possível carregar as empresas vinculadas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const handleEntrar = async (empresa) => {
    setSwitching(empresa.id);
    setSwitchError(null);
    try {
      // 1. Registrar alternância na trilha de auditoria
      await api.post('/contador/switch-context', { empresa_id: empresa.id });

      // 2. Ativar o tenant no contexto local (igual ao fluxo normal)
      await setActiveTenant(String(empresa.id));

      // 3. Navegar para o dashboard da empresa
      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Erro ao entrar na empresa.';
      setSwitchError(detail);
    } finally {
      setSwitching(null);
    }
  };

  const handleDetalhe = (empresa) => {
    navigate(`/contador/empresa/${empresa.id}`);
  };

  const empresasFiltradas = empresas.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.razao_social || '').toLowerCase().includes(q) ||
      (e.nome_fantasia || '').toLowerCase().includes(q) ||
      (e.cnpj || '').includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
            <Landmark size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Portal do Contador
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Empresas vinculadas à sua conta
            </p>
          </div>
        </div>
        <button
          onClick={fetchEmpresas}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 text-xs font-bold transition-colors"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Busca */}
      {!loading && !error && empresas.length > 0 && (
        <div className="mb-5 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar empresa por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-primary/40 transition-colors"
          />
        </div>
      )}

      {/* Estado de carregamento */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
          <span className="text-sm font-medium">Carregando empresas...</span>
        </div>
      )}

      {/* Erro */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-rose-500">
          <AlertTriangle size={32} />
          <p className="text-sm font-bold">{error}</p>
          <button
            onClick={fetchEmpresas}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Sem empresas */}
      {!loading && !error && empresas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <Wallet size={40} className="opacity-40" />
          <p className="text-sm font-bold">Nenhuma empresa vinculada.</p>
          <p className="text-xs text-slate-500">
            Solicite ao administrador que vincule sua conta como contador.
          </p>
        </div>
      )}

      {/* Erro de troca de contexto */}
      {switchError && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="text-sm font-medium">{switchError}</span>
          <button
            onClick={() => setSwitchError(null)}
            className="ml-auto text-rose-400 hover:text-rose-500 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid de empresas */}
      {!loading && !error && empresas.length > 0 && (
        <>
          <p className="text-xs text-slate-500 mb-4 font-medium">
            {empresasFiltradas.length} {empresasFiltradas.length === 1 ? 'empresa' : 'empresas'} {search ? 'encontrada(s)' : 'vinculada(s)'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {empresasFiltradas.map((empresa) => (
              <div key={empresa.id} className="relative">
                {switching === empresa.id && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 text-brand-primary text-xs font-black uppercase tracking-widest">
                      <RefreshCw size={14} className="animate-spin" />
                      Entrando...
                    </div>
                  </div>
                )}
                <EmpresaCard empresa={empresa} onEntrar={handleEntrar} onDetalhe={handleDetalhe} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
