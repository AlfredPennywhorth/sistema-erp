import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Landmark, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().min(1, 'O e-mail é obrigatório'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, setActiveTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/selecionar-empresa";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setError('');
    try {
      const res = await login(data.email, data.password);
      
      // Lógica de Redirecionamento (Casos A, B e C)
      const numTenants = res?.tenants?.length || 0;

      if (numTenants === 1) {
        // Caso A: 1 Empresa -> Vai direto
        await setActiveTenant(res.tenants[0].id);
        navigate('/dashboard', { replace: true });
      } else if (numTenants > 1) {
        // Caso B: Múltiplas -> Escolha necessária
        navigate('/selecionar-empresa', { replace: true });
      } else {
        // Caso C: 0 Empresas -> Leva ao SelectTenant que mostrará o bloqueio/onboarding
        navigate('/selecionar-empresa', { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Falha ao realizar login. Verifique suas credenciais.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/50 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse decoration-indigo-500" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary text-white shadow-xl shadow-brand-primary/30 mb-4">
            <Landmark size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white uppercase mb-2">
            Acesso ao <span className="text-brand-primary">Portal</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Bem-vindo de volta ao ERP Modular.</p>
        </div>

        <div className="glass-card p-8 shadow-2xl border-slate-200/50 dark:border-white/5">
          {/* Removido alerta de modo dev obsoleto */}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide px-1">E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-primary transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="text"
                  {...register('email')}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none text-slate-800 dark:text-white font-medium"
                  placeholder="seu@email.com ou 'admin'"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Senha</label>
                <button type="button" className="text-xs font-bold text-brand-primary hover:underline">Esqueceu a senha?</button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none text-slate-800 dark:text-white font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm font-medium"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-brand-primary/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>Entrar no Sistema <ChevronRight size={20} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Não tem uma empresa registrada? <br />
              <button 
                onClick={() => navigate('/onboarding')} 
                className="text-brand-primary font-bold hover:underline mt-1"
              >
                Abrir Minha Empresa Agora
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
