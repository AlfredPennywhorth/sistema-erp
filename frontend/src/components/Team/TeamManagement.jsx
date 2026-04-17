import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, MoreHorizontal, Mail, Calendar, User, Trash2, Copy, Send, Shield, UserMinus, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, getTenantId } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import EmptyState from './EmptyState';
import InviteModal from './InviteModal';

const ActionMenu = ({ member, onAction, onClose }) => {
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/finalizar-registro?token=${member.token || member.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden backdrop-blur-xl"
    >
      <div className="p-2 space-y-1">
        {member.status === 'PENDENTE' && (
          <>
            <button 
              onClick={() => onAction('resend', member.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <Send size={16} className="text-brand-primary" />
              Reenviar E-mail
            </button>
            <button 
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-blue-400" />}
              {copied ? "Link Copiado!" : "Copiar Link"}
            </button>
            <div className="h-px bg-white/5 my-1" />
          </>
        )}

        {/* Alterar Função (Submenu simulado por simplicidade visual) */}
        <div className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Alterar Função</div>
        {[
          { id: 'ADMIN', label: 'Administrador' },
          { id: 'MANAGER', label: 'Gerente' },
          { id: 'OPERATOR', label: 'Operador' },
          { id: 'VIEWER', label: 'Visualizador' }
        ].map((role) => (
          <button 
            key={role.id}
            onClick={() => onAction('role', member.id, role.id)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-all ${member.role === role.id ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {role.label}
            {member.role === role.id && <Shield size={12} />}
          </button>
        ))}

        <div className="h-px bg-white/5 my-1" />
        
        <button 
          onClick={() => onAction('delete', member.id)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl transition-all"
        >
          <Trash2 size={16} />
          {member.status === 'PENDENTE' ? 'Cancelar Convite' : 'Remover Acesso'}
        </button>
      </div>
    </motion.div>
  );
};

const TeamManagement = () => {
  const [members, setMembers] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const navigate = useNavigate();
  const { activeTenant, setActiveTenant } = useAuth();

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Tenta obter o tenantId do localStorage, mas valida com o activeTenant do Contexto
      const storageTenantId = getTenantId();
      
      console.log(`[DEBUG] localStorage tenant_id: ${storageTenantId}`);
      
      if (!storageTenantId) {
        setError("Nenhuma empresa configurada encontrada. Por favor, complete a Configuracao Inicial primeiro.");
        setLoading(false);
        return;
      }

      const response = await api.get('/team/members');
      
      if (response.data) {
        setMembers(response.data.members || []);
        setCompanyName(response.data.company_name || 'Minha Empresa');
      }
    } catch (err) {
      console.error("Erro ao buscar membros no Backend:", err);
      if (err.response?.status === 403) {
        setError("O usuário logado não possui vínculo com este Tenant ID.");
      } else if (err.response?.status === 400) {
        setError(`Configuração de Sessão Inválida: ${err.response.data?.detail || 'Selecione uma empresa.'}`);
      } else if (!err.response) {
        setError("Não foi possível conectar ao servidor (Backend Offline ou CORS). Verifique se o terminal do Python está rodando em http://127.0.0.1:8000.");
      } else {
        setError(err.response.data?.detail || "Erro inesperado ao carregar membros.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAction = async (type, id, data = null) => {
    setActiveMenu(null);
    try {
      if (type === 'delete') {
        if (!confirm("Tem certeza que deseja remover este membro/convite?")) return;
        await api.delete(`/team/members/${id}`);
      } else if (type === 'resend') {
        await api.post(`/team/resend-invite/${id}`);
        alert("E-mail de convite reenviado!");
      } else if (type === 'role') {
        await api.patch(`/team/members/${id}/role`, { role: data });
      }
      fetchMembers();
    } catch (err) {
      console.error(`Erro ao executar acao ${type}:`, err);
      alert("Erro ao processar acao. Verifique os logs.");
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      OWNER: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
      PARTNER: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      ADMIN: "bg-red-500/10 text-red-400 border-red-500/20",
      MANAGER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      OPERATOR: "bg-green-500/10 text-green-400 border-green-500/20",
      VIEWER: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return roles[role] || roles.VIEWER;
  };

  const translateRole = (role) => {
    const roles = {
      OWNER: "Dono",
      PARTNER: "Sócio",
      ADMIN: "Administrador",
      MANAGER: "Gerente",
      OPERATOR: "Operador",
      VIEWER: "Visualizador",
    };
    return roles[role] || role;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex flex-col md:flex-row md:items-center gap-3">
            <span className="flex items-center gap-3">
              Minha Equipe
              <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full text-slate-400">
                {members.length} membros
              </span>
            </span>
            {companyName && (
              <span className="text-sm font-black text-brand-primary uppercase tracking-widest border-l-2 border-brand-primary/30 pl-4 hidden md:block">
                {companyName}
              </span>
            )}
          </h2>
          <p className="text-slate-400 mt-1">Gerencie permissoes e convide novos colaboradores para o seu tenant.</p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/80 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95"
        >
          <UserPlus size={20} />
          Convidar Membro
        </button>
      </div>
      
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-8 text-center space-y-4 mb-8 backdrop-blur-md">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-500">
            <Mail size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Configuracao Necessaria</h3>
          <p className="text-slate-400 max-w-md mx-auto">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="btn-primary inline-flex items-center gap-2 px-8"
          >
            Ir para Configuracao Inicial
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="space-y-6">
          <EmptyState onInvite={() => setIsInviteModalOpen(true)} />
          <div className="flex flex-col items-center gap-4 p-8 border border-white/5 bg-white/5 rounded-3xl">
             <p className="text-sm text-slate-400">Não está vendo os membros? O seu navegador pode estar com o identificador da empresa desatualizado.</p>
             <button 
                onClick={() => {
                  localStorage.removeItem('erp_tenant_id');
                  window.location.href = '/'; 
                }}
                className="text-brand-primary font-bold hover:underline py-2 px-4 rounded-xl border border-brand-primary/20 hover:bg-brand-primary/5 transition-all text-xs"
             >
                🔄 Reparar Sincronização e Recarregar
             </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-white/10 rounded-3xl bg-slate-900/50 backdrop-blur-xl shadow-2xl"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Membro</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Funcao</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Cadastrado em</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {members.map((member) => (
                  <motion.tr 
                    key={member.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="group hover:bg-white/5 transition-colors cursor-default"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-white shadow-inner">
                          {member.status === 'PENDENTE' ? <Mail size={16} className="text-slate-400" /> : <User size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-white capitalize">{member.name || 'Convidado'}</p>
                          <p className="text-sm text-slate-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest ${getRoleBadge(member.role)}`}>
                        {translateRole(member.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${member.status === 'ATIVO' ? 'bg-green-500' : 'bg-amber-400'} animate-pulse`} />
                        <span className="text-sm font-medium text-slate-300 capitalize">{member.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Calendar size={14} />
                        {member.joinedAt || 'Pendente'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                        className={`p-2 rounded-xl transition-all ${activeMenu === member.id ? 'bg-brand-primary text-white' : 'hover:bg-white/10 text-slate-500 hover:text-white'}`}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      
                      <AnimatePresence>
                        {activeMenu === member.id && (
                          <ActionMenu 
                            member={member} 
                            onAction={handleAction} 
                            onClose={() => setActiveMenu(null)} 
                          />
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}

      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onInviteSuccess={fetchMembers}
      />
    </div>
  );
};

export default TeamManagement;
