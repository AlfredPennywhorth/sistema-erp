import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Plus, ArrowRight, Building2, Check, LayoutGrid, List, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

export default function SelectTenant() {
  const { user, setActiveTenant, activeTenant, userTenants } = useAuth();
  // 🚀 Usa o cache do contexto como valor inicial — zero espera na maioria dos casos
  const [tenants, setTenants] = useState(userTenants || []);
  const [loading, setLoading] = useState(userTenants?.length === 0); // só mostra loading se não há cache
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const navigate = useNavigate();

  useEffect(() => {
    // Se já temos empresas do cache do AuthContext, não bloqueia a tela
    if (userTenants?.length > 0) {
      setTenants(userTenants);
      setLoading(false);
      return;
    }
    // Só busca da API se o cache estiver vazio
    if (user) fetchTenants();
  }, [user, userTenants]);

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/tenants/list', {
        headers: { 'X-User-ID': user.id }
      });
      const list = res.data || [];
      setTenants(list);

      // Auto-select removido daqui (agora gerenciado pelo fluxo de login/contexto)
    } catch (err) {
      console.error('[SelectTenant] Erro ao carregar empresas:', err);
      setError('Não foi possível conectar ao servidor. Verifique se o backend está ativo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (tenant) => {
    await setActiveTenant(tenant.id);
    navigate('/dashboard');
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // ─── Loading (só se não há cache) ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
          <p className="text-blue-400 font-black tracking-[0.2em] text-sm animate-pulse">CARREGANDO EMPRESAS</p>
        </div>
      </div>
    );
  }

  // ─── Caso C: Nenhuma empresa vinculada (Empty State) ────────────────────────
  if (!loading && tenants.length === 0) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 max-w-lg text-center bg-slate-900/50 p-12 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-2xl"
        >
          <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            <AlertTriangle size={40} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-white font-black text-2xl mb-3 tracking-tight">SEM ACESSO OPERACIONAL</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
              Sua conta ainda não possui vínculos com nenhuma empresa. <br />
              Por razões de segurança, o acesso aos módulos financeiros está bloqueado até que uma organização seja configurada ou vinculada.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => navigate('/onboarding')}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-brand-primary/20"
            >
              <Plus size={18} />
              Criar Primeira Empresa
            </button>
            <button
              onClick={() => window.location.href = 'mailto:suporte@erp.com'}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all border border-white/5"
            >
              Suporte
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Tela principal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Landmark size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase">
            Nexus ERP
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Botão Atualizar */}
          <button
            onClick={fetchTenants}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all group"
            title="Atualizar lista"
          >
            <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>

          {/* Toggle Grid/Lista */}
          <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter leading-none bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
            A qual operação vamos <br /> nos dedicar <span className="text-blue-500">hoje?</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Selecione uma empresa para iniciar a gestão financeira e contábil.
          </p>
        </motion.div>

        {/* Banner de erro suave (quando tem cache mas refresh falhou) */}
        {error && tenants.length > 0 && (
          <div className="mb-6 px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-400 text-xs font-bold">
            <AlertTriangle size={14} />
            Usando dados em cache. Backend indisponível.
          </div>
        )}

        {viewMode === 'grid' ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl"
          >
            {tenants.map((tenant) => (
              <motion.button
                key={tenant.id}
                variants={item}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => handleSelect(tenant)}
                className={`group relative p-6 rounded-3xl text-left transition-all border ${
                  activeTenant?.id === tenant.id
                    ? 'bg-blue-600/10 border-blue-500/50 ring-4 ring-blue-500/10'
                    : 'bg-slate-900/40 border-white/5 hover:border-blue-500/30 hover:bg-slate-800/60 shadow-xl'
                } backdrop-blur-md overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 via-transparent to-blue-600/0 group-hover:from-blue-600/5 transition-all duration-500" />
                <div className="relative z-10 flex flex-col h-full gap-5">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-blue-500/30 group-hover:bg-blue-600/20 transition-all duration-500 shadow-inner">
                      <Building2 size={28} className="text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-500" />
                    </div>
                    {activeTenant?.id === tenant.id && (
                      <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg shadow-blue-900/50">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-100 mb-1 line-clamp-1 truncate uppercase tracking-tight">
                      {tenant.razao_social}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 group-hover:text-slate-400 uppercase tracking-widest">
                      {tenant.cnpj || 'CNPJ não informado'}
                    </p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-500/70 group-hover:text-blue-400 transition-colors">
                      Acessar Unidade
                    </span>
                    <ArrowRight size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </div>
              </motion.button>
            ))}

            {/* Card Nova Empresa */}
            <motion.button
              variants={item}
              whileHover={{ y: -8 }}
              onClick={() => navigate('/onboarding')}
              className="p-6 rounded-3xl bg-slate-800/20 border-2 border-dashed border-white/5 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all group flex flex-col items-center justify-center gap-4 min-h-[220px]"
            >
              <div className="w-14 h-14 bg-slate-800/50 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg">
                <Plus size={32} />
              </div>
              <div className="text-center">
                <p className="font-black uppercase tracking-tighter text-slate-300 group-hover:text-white transition-colors">Nova Empresa</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1 group-hover:text-blue-300/50">Expandir Operação</p>
              </div>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl space-y-3">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleSelect(tenant)}
                className="w-full p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center gap-5 hover:bg-slate-800/60 hover:border-blue-500/30 transition-all group hover:shadow-2xl hover:scale-[1.01]"
              >
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5 group-hover:bg-blue-600 transition-all">
                  <Building2 size={24} className="text-blue-400 group-hover:text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-lg text-white group-hover:text-blue-100 uppercase tracking-tight leading-none">{tenant.razao_social}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 group-hover:text-slate-400">{tenant.cnpj}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="h-8 w-[1px] bg-white/5" />
                  <ArrowRight size={20} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </main>

      <footer className="p-8 mt-auto text-center relative z-10 border-t border-white/5">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
          Ambiente de Alta Disponibilidade • ERP Nexus
        </p>
      </footer>
    </div>
  );
}
