import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar, 
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  X
} from 'lucide-react';
import { api } from '../../lib/api';
import LiquidacaoModal from '../../components/Financeiro/LiquidacaoModal';

const ContasPagar = () => {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLancamento, setSelectedLancamento] = useState(null);
  const [isLiquidacaoOpen, setIsLiquidacaoOpen] = useState(false);
  
  // Estados para Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [parceiros, setParceiros] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [filtros, setFiltros] = useState({
    periodo: 'mes_atual',
    data_inicio: '',
    data_fim: '',
    descricao: '',
    parceiro_id: '',
    categoria_id: ''
  });
  const [appliedFilters, setAppliedFilters] = useState(filtros);

  useEffect(() => {
    fetchParceiros();
    fetchPlanoContas();
    
    const handleUpdate = () => fetchLancamentos(appliedFilters);
    window.addEventListener('financeiro-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('financeiro-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    fetchLancamentos(appliedFilters);
  }, [appliedFilters]);

  const fetchParceiros = async () => {
    try {
      const res = await api.get('/parceiros');
      setParceiros(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar parceiros:", err);
    }
  };

  const fetchPlanoContas = async () => {
    try {
      const res = await api.get('/financeiro/plano-contas');
      setPlanoContas(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar plano de contas:", err);
    }
  };

  const getPeriodoFromFiltros = (f) => {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth();
    if (f.periodo === 'mes_atual') {
      return {
        data_inicio: new Date(ano, mes, 1).toISOString().split('T')[0],
        data_fim: new Date(ano, mes + 1, 0).toISOString().split('T')[0]
      };
    } else if (f.periodo === 'mes_anterior') {
      return {
        data_inicio: new Date(ano, mes - 1, 1).toISOString().split('T')[0],
        data_fim: new Date(ano, mes, 0).toISOString().split('T')[0]
      };
    } else if (f.periodo === 'ultimos_3_meses') {
      return {
        data_inicio: new Date(ano, mes - 2, 1).toISOString().split('T')[0],
        data_fim: new Date(ano, mes + 1, 0).toISOString().split('T')[0]
      };
    } else if (f.periodo === 'personalizado') {
      return { data_inicio: f.data_inicio, data_fim: f.data_fim };
    }
    return { data_inicio: '', data_fim: '' };
  };

  const fetchLancamentos = async (filtrosAtivos = appliedFilters) => {
    try {
      setLoading(true);
      const periodo = getPeriodoFromFiltros(filtrosAtivos);
      
      const params = { 
        natureza: 'PAGAR',
        ...(periodo.data_inicio && { data_inicio: periodo.data_inicio }),
        ...(periodo.data_fim && { data_fim: periodo.data_fim }),
        ...(filtrosAtivos.descricao && { descricao: filtrosAtivos.descricao }),
        ...(filtrosAtivos.parceiro_id && { parceiro_id: filtrosAtivos.parceiro_id }),
        ...(filtrosAtivos.categoria_id && { plano_contas_id: filtrosAtivos.categoria_id })
      };

      console.log('[CONTAS PAGAR] Request real:', params);
      const response = await api.get('/financeiro/', { params });
      setLancamentos(response.data);
    } catch (err) {
      console.error("Erro ao carregar contas a pagar:", err);
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    const reset = {
      periodo: 'mes_atual',
      data_inicio: '',
      data_fim: '',
      descricao: '',
      parceiro_id: '',
      categoria_id: ''
    };
    setFiltros(reset);
    setAppliedFilters(reset);
    setShowFilters(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'ABERTO': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'PAGO': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'CANCELADO': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      'PARCIAL': 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles['ABERTO']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header com Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
              <TrendingDown size={28} />
            </div>
            Contas a Pagar
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Gestão de despesas, fornecedores e fluxo de saídas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border ${
              showFilters || Object.values(appliedFilters).some(v => v !== '' && v !== 'mes_atual')
              ? 'bg-red-500/10 border-red-500 text-red-500' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            {showFilters ? 'Fechar Filtros' : 'Filtros'}
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-quick-launch', { detail: { natureza: 'PAGAR' } }))}
            className="px-6 py-2.5 bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Título
          </button>
        </div>
      </div>

      {/* Cards de Resumo (Calculados localmente para refletir filtros) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            label: 'Total em Aberto', 
            value: (lancamentos.filter(l => l.status === 'ABERTO').reduce((acc, l) => acc + Number(l.valor_previsto), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
            color: 'red', 
            icon: <Clock size={20}/> 
          },
          { 
            label: 'Vence Hoje', 
            value: (lancamentos.filter(l => l.status === 'ABERTO' && l.data_vencimento === new Date().toISOString().split('T')[0]).reduce((acc, l) => acc + Number(l.valor_previsto), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
            color: 'amber', 
            icon: <AlertCircle size={20}/> 
          },
          { 
            label: 'Pago no Período', 
            value: (lancamentos.filter(l => l.status === 'PAGO').reduce((acc, l) => acc + Number(l.valor_pago), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
            color: 'emerald', 
            icon: <CheckCircle2 size={20}/> 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-${stat.color}-500/10 rounded-2xl text-${stat.color}-500`}>
                {stat.icon}
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Tabela de Lançamentos */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h2 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">
            {loading ? 'Buscando...' : `${lancamentos.length} Lançamentos Encontrados`}
          </h2>
          {(appliedFilters.descricao || appliedFilters.parceiro_id || appliedFilters.categoria_id || appliedFilters.periodo !== 'mes_atual') && (
            <button 
              onClick={limparFiltros}
              className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1"
            >
              <X size={12} />
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Barra de Filtros Progressiva */}
        {showFilters && (
          <div className="px-8 py-6 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Período (Vencimento)</label>
              <select 
                value={filtros.periodo}
                onChange={(e) => setFiltros({...filtros, periodo: e.target.value})}
                className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
              >
                <option value="mes_atual">Mês Atual</option>
                <option value="mes_anterior">Mês Anterior</option>
                <option value="ultimos_3_meses">Últimos 3 Meses</option>
                <option value="personalizado">Personalizado</option>
              </select>
              {filtros.periodo === 'personalizado' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input 
                    type="date"
                    value={filtros.data_inicio}
                    onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value})}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-slate-700 dark:text-white outline-none"
                  />
                  <input 
                    type="date"
                    value={filtros.data_fim}
                    onChange={(e) => setFiltros({...filtros, data_fim: e.target.value})}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-slate-700 dark:text-white outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
              <input 
                type="text"
                placeholder="Ex: Aluguel..."
                value={filtros.descricao}
                onChange={(e) => setFiltros({...filtros, descricao: e.target.value})}
                className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Fornecedor</label>
              <select 
                value={filtros.parceiro_id}
                onChange={(e) => setFiltros({...filtros, parceiro_id: e.target.value})}
                className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
              >
                <option value="">Todos</option>
                {parceiros.map(p => (
                  <option key={p.id} value={p.id}>{p.nome_razao}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                <select 
                  value={filtros.categoria_id}
                  onChange={(e) => setFiltros({...filtros, categoria_id: e.target.value})}
                  className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
                >
                  <option value="">Todas</option>
                  {planoContas.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setAppliedFilters({...filtros})}
                className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-md shadow-red-600/10 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px) font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic">Filtrando lançamentos...</td>
                </tr>
              ) : lancamentos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic font-medium">
                    Nenhum lançamento encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-red-500 transition-colors">{l.descricao}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black">{l.parceiro?.nome_razao || 'Fornecedor avulso'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-sm">
                        <Calendar size={14} className="text-slate-300" />
                        {new Date(l.data_vencimento).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="font-black text-slate-900 dark:text-white tracking-tight">
                        {Number(l.valor_previsto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      {getStatusBadge(l.status)}
                    </td>
                    <td className="px-8 py-4 text-right">
                      {l.status === 'ABERTO' && (
                        <button 
                          onClick={() => {
                            setSelectedLancamento(l);
                            setIsLiquidacaoOpen(true);
                          }}
                          className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Liquidar
                        </button>
                      )}
                      {l.status === 'PAGO' && (
                        <div className="flex items-center justify-end gap-2 text-emerald-500">
                          <CheckCircle2 size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Liquidado</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isLiquidacaoOpen && (
        <LiquidacaoModal 
          isOpen={isLiquidacaoOpen}
          onClose={() => setIsLiquidacaoOpen(false)}
          lancamento={selectedLancamento}
          onSuccess={() => fetchLancamentos(appliedFilters)}
        />
      )}
    </div>
  );
};

export default ContasPagar;
