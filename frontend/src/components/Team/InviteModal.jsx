import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, Send, Check, Copy, UserPlus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';

const InviteModal = ({ isOpen, onClose, onInviteSuccess }) => {
  const { activeTenant } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    setShowSuccess(false);
    try {
      const response = await api.post('/team/invite', { email, role });
      if (response.data?.token) {
        setInviteToken(response.data.token);
        setShowSuccess(true);
      }
      setIsSending(false);
      onInviteSuccess();
      // Não limpa o link IMEDIATAMENTE para permitir cópia
    } catch (err) {
      setIsSending(false);
      console.error("Erro ao enviar convite:", err);
      
      // Formatação Robusta de Erro para evitar "Objects are not valid as a React child"
      const errorData = err.response?.data?.detail;
      if (Array.isArray(errorData)) {
        // Erro de validação do Pydantic/FastAPI
        const messages = errorData.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ');
        setError(`Erro de validação: ${messages}`);
      } else if (typeof errorData === 'object' && errorData !== null) {
        setError(JSON.stringify(errorData));
      } else {
        setError(errorData || err.message || "Erro ao conectar com o servidor.");
      }
    }
  };

  const handleCopyLink = () => {
    if (!inviteToken) {
      setError("Envie o convite primeiro para gerar o link.");
      return;
    }
    const baseUrl = window.location.origin;
    const fullLink = `${baseUrl}/finalizar-registro?token=${inviteToken}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center text-brand-primary">
                <UserPlus size={20} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Convidar Membro</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleInvite} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
                E-mail do convidado
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Atribuir Função (Permissão)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="ADMIN" className="bg-slate-900">Administrador (Acesso Total)</option>
                <option value="MANAGER" className="bg-slate-900">Gerente (Gestão de Módulos)</option>
                <option value="OPERATOR" className="bg-slate-900">Operador (Escrita e Leitura)</option>
                <option value="VIEWER" className="bg-slate-900">Visualizador (Apenas Consulta)</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-4">
                <AlertCircle size={18} />
                <p>{error}</p>
              </div>
            )}

            {showSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-400 text-sm animate-in fade-in slide-in-from-top-4">
                <Check size={18} />
                <p>Convite registrado! Agora você pode copiar o link abaixo.</p>
              </div>
            )}

            <div className="pt-4 space-y-3">
            {activeTenant ? (
              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-brand-primary hover:bg-brand-primary/80 disabled:opacity-50 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-primary/20"
              >
                {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                Enviar Convite por E-mail
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-amber-400 text-sm">
                <AlertCircle size={20} />
                <p className="text-center">Selecione uma empresa no dashboard antes de enviar convites.</p>
              </div>
            )}

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-300 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-white/5"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                {copied ? "Link Copiado!" : "Copiar Link de Convite"}
              </button>
            </div>
          </form>

          <div className="px-8 py-4 bg-slate-950/50 border-t border-white/5">
            <p className="text-xs text-slate-500 text-center uppercase tracking-widest font-bold">
              Seguranca Garantida • Link expira em 48h
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InviteModal;
