import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { api } from '../../lib/api';

const Tesouraria = () => {
  const [loading, setLoading] = useState(true);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [contas, setContas] = useState([]);
  const [extrato, setExtrato] = useState([]);
  const [selectedContaId, setSelectedContaId] = useState(null);
  const [editingMovimentacao, setEditingMovimentacao] = useState(null);
  const [planoContas, setPlanoContas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationData, setPaginationData] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      handleFilterExtrato();
    }
  }, [selectedContaId, currentPage, pageSize]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contasRes, extratoRes, planoRes] = await Promise.all([
        api.get('/financeiro/contas-bancarias'),
        api.get('/financeiro/extrato', { params: { page: currentPage, size: pageSize } }),
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

  const handleFilterExtrato = async () => {
    try {
      setExtratoLoading(true);
      const params = { 
        page: currentPage,
        size: pageSize,
        ...(selectedContaId && { conta_bancaria_id: selectedContaId })
      };
      const res = await api.get('/financeiro/extrato', { params });
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

  const toggleContaFilter = (id) => {
    setSelectedContaId(prev => prev === id ? null : id);
    setCurrentPage(1);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setExtratoLoading(true);
      const { id, descricao, plano_contas_id, conta_bancaria_id, data: data_pagamento, valor: valor_pago } = editingMovimentacao;
      
      const payload = {
        descricao,
        plano_contas_id,
        conta_bancaria_id,
        data_pagamento,
        valor_pago: Number(valor_pago)
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
      case 'POUPANCA': return <TrendingUp className="text-blue-500" />;
      case 'DINHEIRO': return <Wallet className="text-emerald-500" />;
      default: return <CreditCard className="text-slate-500" />;
    }
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
          <button className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
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
                {getIcon(conta.tipo)}
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                {conta.tipo}
              </span>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{conta.nome}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
              R$ {Number(conta.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold">
               <span className="text-slate-400">Ag: {conta.agencia} | Cc: {conta.conta}</span>
               <span className="text-emerald-500 flex items-center gap-1">
                 <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                 Atualizado
               </span>
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
             <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400">
               <Calendar size={14} />
               Mês Atual
             </button>
             <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400">
               <Filter size={18} />
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
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
                          onClick={() => setEditingMovimentacao({...m})}
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
