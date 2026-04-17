import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Building2,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { api, supabase } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/branding';

const FinalizarRegistro = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { setActiveTenant, setMockUser } = useAuth();
  const isDebug = import.meta.env.VITE_DEBUG_MODE === 'true';

  const logDebug = (msg, data = null) => {
    if (isDebug) {
      if (data) console.log(`[INVITE] ${msg}`, data);
      else console.log(`[INVITE] ${msg}`);
    }
  };
// ... (omitting lines for brevity in thought, but tool call must be precise)

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    password: '',
    confirmPassword: ''
  });

  const isFormValid = useMemo(() => {
    return formData.nome.length > 2 && 
           formData.password.length >= 6 && 
           formData.password === formData.confirmPassword;
  }, [formData]);

  useEffect(() => {
    let isMounted = true;
    if (success) return; 
    
    logDebug("Efetuando verificação inicial do Token", token);

    if (!token || token === '<token_existente>') {
      logDebug("TOKEN INVÁLIDO OU AUSENTE");
      setError('Token de convite não encontrado ou inválido.');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        logDebug("Buscando detalhes do convite...");
        const response = await api.get(`/team/invite-details/${token}`);
        logDebug("Sucesso ao obter detalhes:", response.data);
        if (isMounted) setInviteDetails(response.data);
      } catch (err) {
        logDebug("FALHA AO BUSCAR DETALHES DO CONVITE", err);
        const msg = err.response?.data?.detail || err.message;
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || !inviteDetails) return;

    setSubmitting(true);
    setError(null);

    try {
      let userId;
      const isPlaceholder = import.meta.env.VITE_SUPABASE_URL?.includes('placeholder.supabase.co');

      logDebug("Iniciando Submissão de Cadastro");

      if (isPlaceholder) {
        logDebug("AMBIENTE MOCK: Usando UUID fictício");
        userId = crypto.randomUUID();
      } else {
        logDebug("Criando usuário no Supabase Auth...");
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: inviteDetails.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.nome
            }
          }
        });

        if (authError) throw new Error(`Erro na autenticação: ${authError.message}`);
        if (!authData.user) throw new Error("Falha ao criar usuário no Supabase.");
        userId = authData.user.id;
        logDebug("Usuário Auth Criado com ID:", userId);
      }

      // 2. Vincular o UUID ao ERP local
      logDebug("Vinculando Usuário ao ERP Local...");
      const finalizeResp = await api.post('/team/finalize-registration', {
        token,
        nome: formData.nome,
        usuario_id: userId
      });
      logDebug("Respostas Finalize:", finalizeResp.data);

      // 3. Atualizar Sessão (Mock)
      if (isPlaceholder) {
        setMockUser({
          id: userId,
          email: inviteDetails.email,
          user_metadata: { full_name: formData.nome }
        });
      }

      // 4. Salvar o Tenant ID
      if (inviteDetails.company_id) {
        logDebug("Setando Empresa Ativa:", inviteDetails.company_id);
        await setActiveTenant(inviteDetails.company_id);
      }
      
      setSuccess(true);
      setError(null);
      
      logDebug("SUCESSO! Redirecionando em 3s...");
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      logDebug("ERRO NO SUBMIT", err);
      const msg = err.response?.data?.detail || err.message;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full mb-6"
        />
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-500 font-medium tracking-widest uppercase text-xs animate-pulse"
        >
          Autenticando Acesso Seguro
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-['Inter'] overflow-hidden relative">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[150px] rounded-full" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-xl relative z-10"
      >
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Panel: Visual/Brand */}
          <div className="md:w-5/12 bg-slate-900 p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 opacity-90" />
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <motion.img 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                src="/logo-enterprise.png" 
                alt={`Logotipo ${BRAND.name}`} 
                className="w-full h-auto rounded-2xl shadow-2xl mb-8 border border-white/20"
              />
              <motion.div variants={itemVariants}>
                <h2 className="text-white text-2xl font-bold leading-tight mb-2">Bem-vindo à Elite</h2>
                <p className="text-white/60 text-sm">Você está prestes a acessar a plataforma {BRAND.name}.</p>
              </motion.div>
            </div>

            <div className="relative z-10 pt-10 border-t border-white/5 mt-10 md:mt-0">
              <div className="flex items-center gap-3 text-white/40 text-[10px] uppercase font-bold tracking-widest">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                Compliance Enterprise
              </div>
            </div>
          </div>

          {/* Right Panel: Form */}
          <div className="md:w-7/12 p-8 md:p-12">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10"
                >
                  <div className="bg-emerald-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">Acesso Liberado!</h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Sua conta foi ativada com sucesso. Estamos preparando seu workspace.
                  </p>
                  <Loader2 className="w-6 h-6 text-brand-primary animate-spin mx-auto" />
                </motion.div>
              ) : error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-10"
                >
                  <div className="bg-rose-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {error.includes('INVITE_ALREADY_USED')
                      ? 'Convite já Utilizado'
                      : error.includes('INVITE_EXPIRED')
                        ? 'Convite Expirado'
                        : error.includes('INVITE_NOT_FOUND')
                          ? 'Link Quebrado'
                          : error.includes('Failed to fetch') 
                            ? 'Erro de Conexão' 
                            : 'Ocorreu um Imprevisto'}
                  </h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                    {error.includes('INVITE_ALREADY_USED')
                      ? 'Este convite já foi processado e sua conta foi criada. Você já pode acessar o sistema com seu e-mail e senha.'
                      : error.includes('INVITE_EXPIRED')
                        ? 'Este convite ultrapassou o tempo limite de segurança. Peça um novo convite ao seu administrador.'
                        : error.includes('INVITE_NOT_FOUND')
                          ? 'O token fornecido não existe ou está incompleto. Verifique se o link foi copiado corretamente.'
                          : error.includes('Failed to fetch') 
                            ? 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.' 
                            : error}
                  </p>

                  <div className="flex flex-col gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/login')}
                      className="bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-3 group"
                    >
                      Ir para Login
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                    
                    {(error.includes('Failed to fetch') || error.includes('EXPIRED')) && (
                      <button 
                        onClick={() => window.location.reload()}
                        className="text-[#005681] text-sm font-medium hover:underline py-2"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="mb-10 text-center md:text-left">
                    <motion.span 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[10px] bg-brand-primary/10 text-brand-primary px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] mb-4 inline-block border border-brand-primary/20"
                    >
                      Segurança de Elite
                    </motion.span>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">
                      Finalizar <span className="text-brand-primary">Registro</span>
                    </h1>
                    <div className="h-1.5 w-12 bg-brand-primary mt-6 rounded-full" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {inviteDetails && (
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#005681] shadow-sm">
                          <Building2 size={24} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{inviteDetails.company_name}</p>
                          <p className="text-[#005681] font-bold text-sm truncate">{inviteDetails.email}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="relative group">
                        <User className="absolute left-5 top-5 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                        <input
                          type="text"
                          required
                          placeholder="Nome Completo"
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-primary focus:bg-white transition-all text-slate-700 font-medium"
                          value={formData.nome}
                          onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        />
                      </div>

                      <div className="relative group">
                        <Lock className="absolute left-5 top-5 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Nova Senha"
                          className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-primary focus:bg-white transition-all text-slate-700 font-medium"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-5 text-slate-400 hover:text-brand-primary"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      <div className="relative group">
                        <KeyRound className="absolute left-5 top-5 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Confirmar Senha"
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-primary focus:bg-white transition-all text-slate-700 font-medium"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !isFormValid}
                      className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all duration-500 shadow-2xl relative overflow-hidden group ${
                        (isFormValid && !submitting)
                        ? 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-brand-primary/30' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none opacity-80'
                      }`}
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span className="relative z-10">Ativar Acesso Enterprise</span>
                          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-[10px] text-slate-400 leading-relaxed">
                      Gerenciado por {BRAND.name} ERP Enterprise. <br/>
                      Seus dados são protegidos por criptografia de ponta a ponta.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating elements for dynamic feel */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-6 -right-6 bg-brand-primary text-white p-4 rounded-3xl shadow-2xl hidden md:block"
        >
          <ShieldCheck size={32} />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default FinalizarRegistro;
