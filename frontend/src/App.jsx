import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MultiStepForm from './components/Onboarding/MultiStepForm';
import TeamManagement from './components/Team/TeamManagement';
import FinalizarRegistro from './pages/FinalizarRegistro';
import Login from './pages/Login';
import SelectTenant from './pages/Auth/SelectTenant';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Financeiro from './pages/Financeiro/Financeiro';
import Parceiros from './pages/Parceiros/Parceiros';
import ContasPagar from './pages/Financeiro/ContasPagar';
import ContasReceber from './pages/Financeiro/ContasReceber';
import Tesouraria from './pages/Financeiro/Tesouraria';
import PlanoContas from './pages/Financeiro/PlanoContas';
import Sidebar from './components/Layout/Sidebar';
import QuickLaunchModal from './components/Financeiro/QuickLaunchModal';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { Landmark, Users, LayoutDashboard, Database, LogOut, TrendingDown, TrendingUp, Wallet, WifiOff } from 'lucide-react';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAuthenticated, activeTenant, loading } = useAuth();
  const [isQuickLaunchOpen, setIsQuickLaunchOpen] = useState(false);
  const [quickLaunchNatureza, setQuickLaunchNatureza] = useState('PAGAR');
  // ✅ FASE 3: Banner de servidor offline
  const [serverOffline, setServerOffline] = useState(false);
  const isSelectionPage = location.pathname === '/selecionar-empresa';
  const isPublicPage = location.pathname === '/login' || location.pathname === '/onboarding' || location.pathname === '/finalizar-registro';
  const isHome = location.pathname === '/';
  const showSidebar = !isPublicPage && !isHome && !isSelectionPage && isAuthenticated && activeTenant;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.altKey) && e.key === 'n') {
        e.preventDefault();
        if (isAuthenticated) {
          setQuickLaunchNatureza('PAGAR');
          setIsQuickLaunchOpen(true);
        }
      }
    };

    const handleOpenQuickLaunch = (e) => {
      const { natureza } = e.detail || {};
      if (natureza) setQuickLaunchNatureza(natureza);
      setIsQuickLaunchOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-quick-launch', handleOpenQuickLaunch);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-launch', handleOpenQuickLaunch);
    };
  }, [isAuthenticated]);

  // ✅ FASE 3: Escutar eventos de conectividade disparados pelo api.js
  useEffect(() => {
    const handleOffline = () => setServerOffline(true);
    const handleOnline = () => setServerOffline(false);
    window.addEventListener('server-offline', handleOffline);
    window.addEventListener('server-online', handleOnline);
    return () => {
      window.removeEventListener('server-offline', handleOffline);
      window.removeEventListener('server-online', handleOnline);
    };
  }, []);

  const handleLogout = async () => {
    console.log("🟡 [APP] Iniciando processo de logout...");
    await logout();
    navigate('/login', { replace: true });
  };

  // 1. Loading Universal para evitar piscada branca
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 animate-pulse tracking-widest text-center">
            CARREGANDO<br/><span className="text-[10px] text-slate-400">HIDRATANDO SISTEMA...</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-brand-primary/20 text-slate-900 dark:text-white transition-colors duration-500">
      {/* ✅ FASE 3: Banner global de servidor offline */}
      {serverOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-rose-600 text-white flex items-center justify-center gap-3 py-2.5 px-4 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <WifiOff size={16} className="shrink-0" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Servidor desconectado — Verifique se o backend está ativo
          </span>
          <button
            onClick={() => window.location.reload()}
            className="ml-4 text-[10px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Sidebar Lateral (Só aparece em páginas internas autenticadas) */}
      {showSidebar && <Sidebar />}

      {/* Main Content Area */}
      <div className={`transition-all duration-500 ${showSidebar ? 'pl-72' : ''}`}>
        <QuickLaunchModal 
          isOpen={isQuickLaunchOpen} 
          onClose={() => setIsQuickLaunchOpen(false)} 
          initialNatureza={quickLaunchNatureza}
          onSuccess={() => {
            // Sucesso! O evento global disparado pelo modal cuidará do refresh
          }}
        />
        
        {/* Header Premium (Só aparece em páginas internas) */}
        {showSidebar && (
          <header className="h-20 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 flex items-center px-8 sticky top-0 z-40">
            <div className="flex items-center gap-4 ml-auto">
              {activeTenant && (
                <div className="px-4 py-2 bg-brand-primary/5 border border-brand-primary/10 rounded-xl flex items-center gap-2">
                  <Landmark size={14} className="text-brand-primary" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {activeTenant.razao_social}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Status: Online</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-slate-400"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          </header>
        )}

        {isPublicPage && !isAuthenticated && (
          <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-50">
            <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/30 group-hover:scale-110 transition-transform">
                  <Landmark size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-blue-400">
                    ERP MODULAR
                  </h1>
                </div>
              </Link>
              <nav className="flex items-center gap-6">
                 <Link to="/login" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary transition-colors">Entrar no Sistema</Link>
              </nav>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={`pb-12 ${isPublicPage || isHome ? 'pt-24' : 'pt-8 px-8'}`}>
          <Routes>
            {/* Rota Raiz Inteligente */}
            <Route path="/" element={
              isAuthenticated ? (
                activeTenant ? <Navigate to="/dashboard" replace /> : <Navigate to="/selecionar-empresa" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />


            {/* Nova Rota de Onboarding dedicada */}
            <Route path="/onboarding" element={
              <div className="animate-in fade-in duration-700">
                <div className="max-w-4xl mx-auto text-center mb-12 px-4 italic">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white mb-6 tracking-tighter leading-tight"
                  >
                    Abrir sua <span className="text-brand-primary">Nova Empresa</span>.
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
                  >
                    Registre sua operação em conformidade com o SPED e LGPD em instantes.
                  </motion.p>
                </div>
                <MultiStepForm />
              </div>
            } />

            <Route path="/selecionar-empresa" element={
              <ProtectedRoute>
                <SelectTenant />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/equipe" element={
              <ProtectedRoute>
                <TeamManagement />
              </ProtectedRoute>
            } />
            <Route path="/relatorios" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/parceiros" element={
              <ProtectedRoute>
                <Parceiros />
              </ProtectedRoute>
            } />
            
            {/* Operações Financeiras */}
            <Route path="/financeiro/pagar" element={
              <ProtectedRoute>
                <ContasPagar />
              </ProtectedRoute>
            } />
            <Route path="/financeiro/receber" element={
              <ProtectedRoute>
                <ContasReceber />
              </ProtectedRoute>
            } />
            <Route path="/financeiro/tesouraria" element={
              <ProtectedRoute>
                <Tesouraria />
              </ProtectedRoute>
            } />
            <Route path="/financeiro/plano-contas" element={
              <ProtectedRoute>
                <PlanoContas />
              </ProtectedRoute>
            } />

            <Route path="/finalizar-registro" element={<FinalizarRegistro />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="py-8 text-center border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-4">
            <span>(c) 2026 Sistema ERP Modular • Foco em LGPD & SPED</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span className="text-brand-primary">Criado por Nexus Souza</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
