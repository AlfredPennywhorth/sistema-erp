import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Building2, 
  CreditCard, 
  History,
  TrendingUp,
  Filter,
  Download,
  Calendar,
  Edit2,
  RotateCcw,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  XCircle,
  Plus,
  PiggyBank,
  Landmark,
} from 'lucide-react';
import { api } from '../../lib/api';

const Tesouraria = () => {
  const [loading, setLoading] = useState(true);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [contas, setContas] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [extrato, setExtrato] = useState([]);
  const [selectedContaId, setSelectedContaId] = useState(null);
  const [editingMovimentacao, setEditingMovimentacao] = useState(null);
  const [showContaModal, setShowContaModal] = useState(false);
  const [contaForm, setContaForm] = useState({
    banco_id: '',
    nome: '',
    agencia: '',
    conta: '',
    tipo_conta: 'CORRENTE',
    saldo_inicial: 0,
    limite_credito: 0,
    conta_contabil_id: '',
  });
  const [contaFormLoading, setContaFormLoading] = useState(false);
  const [planoContas, setPlanoContas] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationData, setPaginationData] = useState({ total: 0, pages: 1 });
  
  const [filtros, setFiltros] = useState({
    periodo: 'mes_atual',
    data_inicio: '',
    data_fim: '',
    descricao: '',
    parceiro_id: '',
    categoria_id: ''
  });
  // appliedFilters é o snapshot dos filtros no momento em que o usuário clicou "Aplicar".
  // Isso evita o bug de closure stale: o useEffect reage a appliedFilters, não a filtros.
  const [appliedFilters, setAppliedFilters] = useState({
    periodo: 'mes_atual',
    data_inicio: '',
    data_fim: '',
    descricao: '',
    parceiro_id: '',
    categoria_id: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
    fetchBancos();
  }, []);

  // Reage a qualquer mudança nos filtros aplicados, conta selecionada, página ou tamanho de página.
  useEffect(() => {
    if (!loading) {
      handleFilterExtrato(appliedFilters);
    }
  }, [appliedFilters, selectedContaId, currentPage, pageSize]);

  useEffect(() => {
    fetchParceiros();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const periodo = getPeriodoDates();
      const [contasRes, extratoRes, planoRes] = await Promise.all([
        api.get('/financeiro/contas-bancarias'),
        api.get('/financeiro/extrato', { 
          params: { 
            page: currentPage, 
            size: pageSize,
            ...(periodo.data_inicio && { data_inicio: periodo.data_inicio }),
            ...(periodo.data_fim && { data_fim: periodo.data_fim })
          } 
        }),
        api.get('/financeiro/plano-contas')
      ]);
      setContas(contasRes.data || []);
      setExtrato(extratoRes.data?.items || []);
      setPaginationData({
        total: extratoRes.data?.total || 0,
        pages: extratoRes.data?.pages || 1
      });
      setPlanoContas(planoRes.data || []);
    } catch (err) {
      console.error("Erro ao carregar tesouraria:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParceiros = async () => {
    try {
      const res = await api.get('/parceiros');
      setParceiros(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar parceiros:", err);
    }
  };

  const fetchBancos = async () => {
    try {
      const res = await api.get('/financeiro/bancos');
      setBancos(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar bancos:", err);
    }
  };

  const handleCreateConta = async (e) => {
    e.preventDefault();
    try {
      setContaFormLoading(true);
      await api.post('/financeiro/contas-bancarias', {
        ...contaForm,
        saldo_inicial: Number(contaForm.saldo_inicial),
        limite_credito: Number(contaForm.limite_credito),
      });
      alert("Conta bancária cadastrada com sucesso!");
      setShowContaModal(false);
      setContaForm({ banco_id: '', nome: '', agencia: '', conta: '', tipo_conta: 'CORRENTE', saldo_inicial: 0, limite_credito: 0, conta_contabil_id: '' });
      fetchData();
    } catch (err) {
      console.error("Erro ao criar conta:", err);
      const msg = err.response?.data?.detail || "Erro ao cadastrar conta bancária.";
      alert(`Falha: ${msg}`);
    } finally {
      setContaFormLoading(false);
    }
  };

  const getPeriodoDates = () => {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth();
    
    if (filtros.periodo === 'mes_atual') {
      const primeiroDia = new Date(ano, mes, 1);
      const ultimoDia = new Date(ano, mes + 1, 0);
      return {
        data_inicio: primeiroDia.toISOString().split('T')[0],
        data_fim: ultimoDia.toISOString().split('T')[0]
      };
    } else if (filtros.periodo === 'mes_anterior') {
      const primeiroDia = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0);
      return {
        data_inicio: primeiroDia.toISOString().split('T')[0],
        data_fim: ultimoDia.toISOString().split('T')[0]
      };
    } else if (filtros.periodo === 'ultimos_3_meses') {
      const primeiroDia = new Date(ano, mes - 2, 1);
      const ultimoDia = new Date(ano, mes + 1, 0);
      return {
        data_inicio: primeiroDia.toISOString().split('T')[0],
        data_fim: ultimoDia.toISOString().split('T')[0]
      };
    } else if (filtros.periodo === 'personalizado') {
      return {
        data_inicio: filtros.data_inicio,
        data_fim: filtros.data_fim
      };
    }
    return { data_inicio: '', data_fim: '' };
  };

  // Recebe os filtros como argumento explícito para evitar closure stale.
  const handleFilterExtrato = async (filtrosAtivos = appliedFilters) => {
    try {
      setExtratoLoading(true);
      // Calcula as datas de período com base nos filtros recebidos como argumento
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

      const periodo = getPeriodoFromFiltros(filtrosAtivos);
      const params = { 
        page: currentPage,
        size: pageSize,
        ...(selectedContaId && { conta_bancaria_id: selectedContaId }),
        ...(periodo.data_inicio && { data_inicio: periodo.data_inicio }),
        ...(periodo.data_fim && { data_fim: periodo.data_fim }),
        ...(filtrosAtivos.descricao && { descricao: filtrosAtivos.descricao }),
        ...(filtrosAtivos.parceiro_id && { parceiro_id: filtrosAtivos.parceiro_id }),
        ...(filtrosAtivos.categoria_id && { categoria_id: filtrosAtivos.categoria_id })
      };
      // Log para auditoria — visível no DevTools > Console
      console.log('[TESOURARIA] GET /financeiro/extrato params:', params);
      const res = await api.get('/financeiro/extrato', { params });
      console.log('[TESOURARIA] Resposta:', res.data?.total, 'total,', res.data?.items?.length, 'itens nesta página');
      setExtrato(res.data?.items || []);
      setPaginationData({
        total: res.data?.total || 0,
        pages: res.data?.pages || 1
      });
    } catch (err) {
      console.error("Erro ao filtrar extrato:", err);
    } finally {
      setExtratoLoading(false);
    }
  };

  const limparFiltros = () => {
    const filtrosReset = {
      periodo: 'mes_atual',
      data_inicio: '',
      data_fim: '',
      descricao: '',
      parceiro_id: '',
      categoria_id: ''
    };
    setFiltros(filtrosReset);
    // Aplica reset imediatamente (sem depender do useEffect de filtros)
    setAppliedFilters(filtrosReset);
    setCurrentPage(1);
    setSelectedContaId(null);
  };

  const exportarCSV = async () => {
    try {
      const periodo = getPeriodoDates();
      const params = { 
        size: 10000,
        page: 1,
        ...(selectedContaId && { conta_bancaria_id: selectedContaId }),
        ...(periodo.data_inicio && { data_inicio: periodo.data_inicio }),
        ...(periodo.data_fim && { data_fim: periodo.data_fim }),
        ...(filtros.descricao && { descricao: filtros.descricao }),
        ...(filtros.parceiro_id && { parceiro_id: filtros.parceiro_id }),
        ...(filtros.categoria_id && { categoria_id: filtros.categoria_id })
      };
      const res = await api.get('/financeiro/extrato', { params });
      const dados = res.data?.items || [];
      
      if (dados.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
      }
      
      const headers = ["Data", "Descrição", "Categoria", "Parceiro", "Valor", "Natureza"];
      const rows = dados.map(item => [
        item.data_pagamento ? new Date(item.data_pagamento).toLocaleDateString('pt-BR') : '',
        item.descricao || '',
        item.categoria_nome || '',
        item.parceiro_nome || '',
        item.valor_pago ? Number(item.valor_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00',
        item.natureza || ''
      ]);
      
      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extrato_tesouraria_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erro ao exportar:", err);
      alert("Erro ao exportar dados.");
    }
  };

  const toggleContaFilter = (id) => {
    setSelectedContaId(prev => prev === id ? null : id);
    setCurrentPage(1);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setExtratoLoading(true);
      const { id, descricao, plano_contas_id, conta_bancaria_id, data, valor } = editingMovimentacao;
      
      const payload = {
        descricao,
        plano_contas_id,
        conta_bancaria_id,
        data_pagamento: data,
        valor_pago: Number(valor)
      };

      await api.patch(`/financeiro/manutencao/${id}`, payload);
      alert("Lançamento atualizado com sucesso!");
      setEditingMovimentacao(null);
      fetchData();
    } catch (err) {
      console.error("Erro detalhado:", err);
      const msg = err.response?.data?.detail || "Erro inesperado ao atualizar lançamento.";
      alert(`Falha na atualização: ${msg}`);
    }
  };

  const handleEstorno = async (id) => {
    if (!window.confirm("Deseja realmente estornar este pagamento? O status voltará para 'Aberto' e o saldo da conta será revertido.")) return;
    
    try {
      setExtratoLoading(true);
      await api.post(`/financeiro/manutencao/${id}/estornar`);
      alert("Estorno realizado com sucesso!");
      fetchData();
    } catch (err) {
      console.error("Erro detalhado:", err);
      const msg = err.response?.data?.detail || "Erro ao realizar estorno.";
      alert(`Falha no estorno: ${msg}`);
    } finally {
      setExtratoLoading(false);
    }
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'CORRENTE': return <Building2 className="text-orange-500" />;
      case 'POUPANCA': return <PiggyBank className="text-blue-500" />;
      case 'INVESTIMENTO': return <TrendingUp className="text-violet-500" />;
      case 'CREDITO': return <CreditCard className="text-rose-500" />;
      case 'CAIXA_FISICO': return <Wallet className="text-emerald-500" />;
      default: return <Landmark className="text-slate-500" />;
    }
  };

  const tipoBadgeLabel = (tipo) => {
    const labels = { CORRENTE: 'Corrente', POUPANCA: 'Poupança', INVESTIMENTO: 'Investimento', CREDITO: 'Crédito', CAIXA_FISICO: 'Caixa Físico' };
    return labels[tipo] || tipo;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Wallet size={28} />
            </div>
            Tesouraria & Extrato
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Monitoramento de saldos, conciliação e histórico bancário consolidado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowContaModal(true)}
            className="px-6 py-2.5 bg-indigo-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Nova Conta
          </button>
          <button 
            onClick={exportarCSV}
            className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 dark:bg-white/5 animate-pulse rounded-[2rem]" />)
        ) : contas.map((conta) => (
          <div 
            key={conta.id} 
            onClick={() => toggleContaFilter(conta.id)}
            className={`cursor-pointer bg-white dark:bg-slate-900 p-6 rounded-[2rem] border transition-all group relative overflow-hidden ${
              selectedContaId === conta.id 
                ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-xl scale-[1.02]' 
                : 'border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/10'
            }`}
          >
            {selectedContaId === conta.id && (
              <div className="absolute top-0 right-0 p-2">
                <div className="bg-indigo-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in duration-300">
                  <Filter size={10} fill="currentColor" />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
                {getIcon(conta.tipo_conta)}
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                {tipoBadgeLabel(conta.tipo_conta)}
              </span>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{conta.nome}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
              R$ {Number(conta.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            {Number(conta.limite_credito) > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Disponível (c/ limite): <span className="font-black text-emerald-500">R$ {Number(conta.saldo_disponivel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
            )}
            
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col gap-1 text-[11px] font-bold">
               <div className="flex items-center justify-between">
                 <span className="text-slate-400">Ag: {conta.agencia} | Cc: {conta.conta}</span>
                 <span className="text-emerald-500 flex items-center gap-1">
                   <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                   Atualizado
                 </span>
               </div>
               {conta.conta_contabil_nome && (
                 <p className="text-[10px] text-slate-400 truncate" title={conta.conta_contabil_nome}>
                   Contábil: <span className="text-slate-600 dark:text-slate-300">{conta.conta_contabil_nome}</span>
                 </p>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* Extrato Consolidado */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
            <History size={18} className="text-indigo-500" />
            Movimentação recente
          </div>
<div className="flex items-center gap-3">
              <select 
                value={filtros.periodo}
                onChange={(e) => {
                  const novoPeriodo = e.target.value;
                  // Atualiza o filtro local E aplica imediatamente (exceto personalizado, que aguarda as datas)
                  const novosFiltros = {...filtros, periodo: novoPeriodo};
                  setFiltros(novosFiltros);
                  if (novoPeriodo !== 'personalizado') {
                    // Aplica período imediatamente sem precisar clicar em "Aplicar"
                    setAppliedFilters(novosFiltros);
                    setCurrentPage(1);
                  }
                }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 focus:outline-none cursor-pointer"
              >
                <option value="mes_atual">Mês Atual</option>
                <option value="mes_anterior">Mês Anterior</option>
                <option value="ultimos_3_meses">Últimos 3 Meses</option>
                <option value="personalizado">Personalizado</option>
              </select>
              
              {filtros.periodo === 'personalizado' && (
                <>
                  <input 
                    type="date"
                    value={filtros.data_inicio}
                    onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value})}
                    className="px-2 py-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 focus:outline-none"
                  />
                  <span className="text-slate-400">até</span>
                  <input 
                    type="date"
                    value={filtros.data_fim}
                    onChange={(e) => setFiltros({...filtros, data_fim: e.target.value})}
                    className="px-2 py-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const novosFiltros = {...filtros};
                      setAppliedFilters(novosFiltros);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-colors"
                  >
                    OK
                  </button>
                </>
              )}
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors ${showFilters ? 'bg-indigo-50 text-indigo-500' : 'text-slate-400'}`}
              >
                <Filter size={18} />
              </button>
            </div>
        </div>

        <div className="overflow-x-auto">
            {showFilters && (
              <div className="px-8 py-4 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Filtrar por descrição..."
                      value={filtros.descricao}
                      onChange={(e) => setFiltros({...filtros, descricao: e.target.value})}
                      className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    {filtros.descricao && (
                      <button 
                        onClick={() => setFiltros({...filtros, descricao: ''})}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parceiro</label>
                  <div className="relative">
                    <select 
                      value={filtros.parceiro_id}
                      onChange={(e) => setFiltros({...filtros, parceiro_id: e.target.value})}
                      className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">Todos os parceiros</option>
                      {parceiros.map(p => (
                        <option key={p.id} value={p.id}>{p.nome_razao}</option>
                      ))}
                    </select>
                    {filtros.parceiro_id && (
                      <button 
                        onClick={() => setFiltros({...filtros, parceiro_id: ''})}
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                  <div className="relative">
                    <select 
                      value={filtros.categoria_id}
                      onChange={(e) => setFiltros({...filtros, categoria_id: e.target.value})}
                      className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">Todas as categorias</option>
                      {planoContas.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    {filtros.categoria_id && (
                      <button 
                        onClick={() => setFiltros({...filtros, categoria_id: ''})}
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-end gap-2">
                  <button 
                    onClick={() => {
                      // Snapshot dos filtros atuais → dispara o useEffect
                      setAppliedFilters({...filtros});
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-colors"
                  >
                    Aplicar
                  </button>
                  <button 
                    onClick={limparFiltros}
                    className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {extratoLoading ? (
                <tr><td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic font-medium animate-pulse">Filtrando extrato...</td></tr>
              ) : (extrato || []).length === 0 ? (
                <tr>
                   <td colSpan="5" className="px-8 py-12 text-center">
                     <div className="flex flex-col items-center gap-3">
                        <TrendingUp size={32} className="text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">
                          {selectedContaId ? 'Nenhuma movimentação nesta conta.' : 'Nenhuma movimentação realizada ainda.'}
                        </p>
                        {selectedContaId && (
                          <button 
                            onClick={() => setSelectedContaId(null)}
                            className="text-xs font-black text-indigo-500 uppercase tracking-widest hover:underline"
                          >
                            Limpar Filtro
                          </button>
                        )}
                     </div>
                   </td>
                </tr>
              ) : (
                (extrato || []).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-4 text-xs font-bold text-slate-500">
                      {m.data_pagamento ? new Date(m.data_pagamento).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{m.descricao}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black">{m.parceiro_nome || 'Lançamento Direto'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                       <span className="text-[10px] font-black px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded text-indigo-500 border border-indigo-100 dark:border-indigo-500/20">
                         {m.categoria_nome || 'Sem Categoria'}
                       </span>
                    </td>
                    <td className={`px-8 py-4 text-right font-black ${m.natureza === 'PAGAR' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {m.valor_pago === null || m.valor_pago === undefined ? (
                        '---'
                      ) : (
                        `${m.natureza === 'PAGAR' ? '-' : '+'} R$ ${Number(m.valor_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      )}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setEditingMovimentacao({
                            ...m,
                            data: m.data_pagamento ? m.data_pagamento.split('T')[0] : '',
                            valor: m.valor_pago
                          })}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                          title="Editar/Reclassificar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleEstorno(m.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-orange-500 transition-colors"
                          title="Estornar Pagamento"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação Tradicional */}
        <div className="px-8 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-xs font-bold text-slate-500">
              Mostrando <span className="text-slate-900 dark:text-white">{extrato?.length || 0}</span> de <span className="text-slate-900 dark:text-white">{paginationData?.total || 0}</span> registros
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exibir:</span>
              <select 
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer hover:text-indigo-500 transition-colors"
                title="Registros por página"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1 || extratoLoading}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              {[...Array(paginationData?.pages || 1)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  paginationData.pages > 7 && 
                  pageNum !== 1 && 
                  pageNum !== paginationData.pages && 
                  (pageNum < currentPage - 1 || pageNum > currentPage + 1)
                ) {
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                  return null;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                      currentPage === pageNum 
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              disabled={currentPage === paginationData.pages || extratoLoading}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Nova Conta Bancária */}
      {showContaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Plus size={20} className="text-indigo-500" />
                Nova Conta Bancária
              </h2>
              <button 
                onClick={() => setShowContaModal(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateConta} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banco</label>
                  <select 
                    value={contaForm.banco_id}
                    onChange={e => setContaForm({...contaForm, banco_id: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>Selecione um banco...</option>
                    {bancos.map(b => (
                      <option key={b.id} value={b.id}>{b.codigo_bacen} – {b.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome / Apelido</label>
                  <input 
                    type="text"
                    placeholder="Ex: Bradesco PJ"
                    value={contaForm.nome}
                    onChange={e => setContaForm({...contaForm, nome: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agência</label>
                  <input 
                    type="text"
                    value={contaForm.agencia}
                    onChange={e => setContaForm({...contaForm, agencia: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número da Conta</label>
                  <input 
                    type="text"
                    value={contaForm.conta}
                    onChange={e => setContaForm({...contaForm, conta: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Conta</label>
                  <select 
                    value={contaForm.tipo_conta}
                    onChange={e => setContaForm({...contaForm, tipo_conta: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="CORRENTE">Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                    <option value="INVESTIMENTO">Investimento</option>
                    <option value="CREDITO">Crédito</option>
                    <option value="CAIXA_FISICO">Caixa Físico</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saldo Inicial (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={contaForm.saldo_inicial}
                    onChange={e => setContaForm({...contaForm, saldo_inicial: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limite de Crédito (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={contaForm.limite_credito}
                    onChange={e => setContaForm({...contaForm, limite_credito: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conta Contábil (Plano de Contas)</label>
                  <select 
                    value={contaForm.conta_contabil_id}
                    onChange={e => setContaForm({...contaForm, conta_contabil_id: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>Selecione a conta contábil...</option>
                    {planoContas.filter(p => p.is_analitica).map(p => (
                      <option key={p.id} value={p.id}>{p.codigo_estruturado} – {p.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowContaModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={contaFormLoading}
                  className="flex-1 px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {contaFormLoading ? 'Salvando...' : 'Cadastrar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingMovimentacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Edit2 size={20} className="text-indigo-500" />
                Corrigir Lançamento
              </h2>
              <button 
                onClick={() => setEditingMovimentacao(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                  <input 
                    type="text"
                    value={editingMovimentacao.descricao}
                    onChange={e => setEditingMovimentacao({...editingMovimentacao, descricao: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Pagamento</label>
                    <input 
                      type="date"
                      value={editingMovimentacao.data?.split('T')[0] || ''}
                      onChange={e => setEditingMovimentacao({...editingMovimentacao, data: e.target.value})}
                      className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Pago (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingMovimentacao.valor || 0}
                      onChange={e => setEditingMovimentacao({...editingMovimentacao, valor: e.target.value})}
                      className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria (Plano de Contas)</label>
                  <select 
                    value={editingMovimentacao.plano_contas_id || ""}
                    onChange={e => setEditingMovimentacao({...editingMovimentacao, plano_contas_id: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>Selecione uma categoria...</option>
                    {planoContas.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conta Bancária</label>
                  <select 
                    value={editingMovimentacao.conta_bancaria_id || ""}
                    onChange={e => setEditingMovimentacao({...editingMovimentacao, conta_bancaria_id: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>Selecione uma conta...</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingMovimentacao(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tesouraria;
