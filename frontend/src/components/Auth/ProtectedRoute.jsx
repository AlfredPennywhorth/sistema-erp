import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, activeTenant } = useAuth();
  const location = useLocation();

  // Spinner APENAS quando não há cache de usuário (primeira vez ou logout)
  // O loading agora dura < 500ms na maioria dos casos (validação de sessão Supabase)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // 2. Redirecionamento Mandatório (Passo 1)
  const isPublic = ['/login', '/register', '/onboarding', '/selecionar-empresa'].includes(location.pathname);
  
  if (isAuthenticated && !activeTenant && !isPublic) {
    return <Navigate to="/selecionar-empresa" />;
  }

  return children;
};

export default ProtectedRoute;
