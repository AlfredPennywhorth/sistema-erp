import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  Landmark,
  ShieldCheck,
  Zap,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
  Settings2,
  Building2,
  ArrowLeftRight,
  BookOpen,
  Banknote,
  Calculator,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { activeTenant: empresa, userTenants } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const mainMenuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Início', path: '/dashboard' },
  ];

  const operationalFinanceItems = [
    { icon: <Building2 size={20} />, label: 'Contas Bancárias', path: '/financeiro' },
    { icon: <TrendingDown size={20} />, label: 'Contas a Pagar', path: '/financeiro/pagar' },
    { icon: <TrendingUp size={20} />, label: 'Contas a Receber', path: '/financeiro/receber' },
    { icon: <Wallet size={20} />, label: 'Tesouraria & Extrato', path: '/financeiro/tesouraria' },
    { icon: <Building2 size={20} />, label: 'Aplicações Financeiras', path: '/financeiro/aplicacoes' },
    { icon: <Banknote size={20} />, label: 'Empréstimos', path: '/financeiro/emprestimos' },
  ];

  const otherMenuItems = [
    { icon: <Users size={20} />, label: 'Parceiros', path: '/parceiros' },
    { icon: <ShieldCheck size={20} />, label: 'Equipe', path: '/equipe' },
    { icon: <BarChart3 size={20} />, label: 'Relatórios', path: '/relatorios' },
    { icon: <Settings2 size={20} />, label: 'Plano de Contas', path: '/financeiro/plano-contas' },
    { 
      icon: <BookOpen size={20} />, 
      label: 'Regras Contábeis', 
      path: '/financeiro/regras-contabeis',
      allowedRoles: ['ADMIN', 'CONTADOR', 'OWNER', 'MANAGER']
    },
    {
      icon: <Calculator size={20} />,
      label: 'Portal Contador',
      path: '/contador',
      allowedRoles: ['CONTADOR'],
    },
  ];

  const contabilidadeItems = [
    {
      icon: <BookOpen size={20} />,
      label: 'Lançamentos',
      path: '/contabilidade/lancamentos',
      allowedRoles: ['ADMIN', 'CONTADOR', 'OWNER', 'MANAGER'],
    },
    {
      icon: <FileSpreadsheet size={20} />,
      label: 'Balancete',
      path: '/contabilidade/balancete',
      allowedRoles: ['ADMIN', 'CONTADOR', 'OWNER', 'MANAGER'],
    },
    {
      icon: <BarChart3 size={20} />,
      label: 'DRE',
      path: '/contabilidade/dre',
      allowedRoles: ['ADMIN', 'CONTADOR', 'OWNER', 'MANAGER'],
    },
  ];

  const filteredContabilidadeItems = contabilidadeItems.filter(item => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(empresa?.user_role);
  });

  const filteredOtherItems = otherMenuItems.filter(item => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(empresa?.user_role);
  });

  const MenuItem = ({ item }) => (
    <Link
      to={item.disabled ? '#' : item.path}
      className={`
        flex items-center gap-4 px-3 py-3 rounded-2xl transition-all group relative
        ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5'}
        ${location.pathname === item.path ? 'bg-brand-primary/10 text-brand-primary' : 'text-slate-400 hover:text-white'}
      `}
    >
      <div className={`transition-transform group-hover:scale-110 ${location.pathname === item.path ? 'text-brand-primary' : 'text-slate-500 group-hover:text-white'}`}>
        {item.icon}
      </div>
      {!isCollapsed && (
        <span className="font-bold text-sm tracking-tight">{item.label}</span>
      )}
      {location.pathname === item.path && (
        <div className="absolute left-[-12px] w-1.5 h-6 bg-brand-primary rounded-r-full" />
      )}
    </Link>
  );

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-slate-900 border-r border-white/5 transition-all duration-500 z-[60] flex flex-col ${isCollapsed ? 'w-20' : 'w-72'}`}
    >
      {/* Logo e Nome da Empresa */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="min-w-[40px] h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
            <Landmark size={20} />
          </div>
          {!isCollapsed && (
            <div className="truncate flex-1">
              <h1 className="text-lg font-black text-white tracking-tight truncate">
                {empresa?.nome_fantasia || empresa?.razao_social || 'ERP MODULAR'}
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-brand-primary font-black">
                {empresa?.cnpj ? `CNPJ: ${empresa.cnpj}` : 'Aguardando Setup'}
              </p>
            </div>
          )}
        </div>
        {/* ✅ FASE 5: Botão Alternar Empresa — só aparece com múltiplas empresas */}
        {!isCollapsed && userTenants?.length > 1 && (
          <button
            onClick={() => navigate('/selecionar-empresa')}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-brand-primary/10 text-slate-400 hover:text-brand-primary text-[10px] font-black uppercase tracking-widest transition-all group"
          >
            <ArrowLeftRight size={12} className="group-hover:rotate-180 transition-transform duration-300" />
            Alternar Empresa
            <span className="ml-auto bg-brand-primary/20 text-brand-primary text-[9px] px-1.5 py-0.5 rounded-full">
              {userTenants.length}
            </span>
          </button>
        )}
      </div>

      {/* Botão de Acesso Rápido */}
      {!isCollapsed && (
        <div className="px-6 py-4">
          <button 
            className="w-full flex items-center justify-center gap-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-brand-primary/20 group transition-all"
            onClick={() => window.dispatchEvent(new CustomEvent('open-quick-launch'))}
          >
            <PlusCircle size={18} className="group-hover:rotate-90 transition-transform" />
            Lançamento Rápido
          </button>
        </div>
      )}

      {/* Navegação */}
      <nav className="flex-1 px-3 py-6 space-y-8 overflow-y-auto overflow-x-hidden">
        {/* Principal */}
        <div className="space-y-1">
          {mainMenuItems.map((item) => <MenuItem key={item.path} item={item} />)}
        </div>

        {/* Operações Financeiras */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Operações Financeiras
            </p>
          )}
          {operationalFinanceItems.map((item) => <MenuItem key={item.path} item={item} />)}
        </div>

        {/* Gestão e Base */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Gestão e Cadastros
            </p>
          )}
          {filteredOtherItems.map((item) => <MenuItem key={item.path} item={item} />)}
        </div>

        {/* Módulo Contábil */}
        {filteredContabilidadeItems.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Módulo Contábil
              </p>
            )}
            {filteredContabilidadeItems.map((item) => <MenuItem key={item.path} item={item} />)}
          </div>
        )}
      </nav>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center text-white border-2 border-slate-900 shadow-xl hover:scale-110 transition-transform"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Footer da Sidebar: Especial Plan Status */}
      {!isCollapsed && (
        <div className="p-4 mx-3 mb-6 bg-gradient-to-br from-indigo-500/10 to-brand-primary/5 rounded-3xl border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Zap size={16} />
            </div>
            <span className="text-xs font-black text-white uppercase tracking-wider">Compliance Ativo</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
            Segregação de Funções (SoD) monitorada pelo sistema.
          </p>
        </div>
      )}
    </aside>
  );
};
export default Sidebar;
