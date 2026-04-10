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
  Clock
} from 'lucide-react';
import { api } from '../../lib/api';
import LiquidacaoModal from '../../components/Financeiro/LiquidacaoModal';

const ContasPagar = () => {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLancamento, setSelectedLancamento] = useState(null);
  const [isLiquidacaoOpen, setIsLiquidacaoOpen] = useState(false);

  useEffect(() => {
    fetchLancamentos();

    const handleUpdate = () => fetchLancamentos();
    window.addEventListener('financeiro-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('financeiro-updated', handleUpdate);
    };
  }, []);

  const fetchLancamentos = async () => {
    try {
      const response = await api.get('/financeiro/', { params: { natureza: 'PAGAR' } });
      setLancamentos(response.data);
    } catch (err) {
      console.error("Erro ao carregar contas a pagar:", err);
    } finally {
      setLoading(false);
    }
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
          <button className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Search size={18} />
            Buscar
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total em Aberto', value: 'R$ 12.450,00', color: 'red', icon: <Clock size={20}/> },
          { label: 'Vence Hoje', value: 'R$ 1.200,30', color: 'amber', icon: <AlertCircle size={20}/> },
          { label: 'Pago (Mês)', value: 'R$ 45.800,00', color: 'emerald', icon: <CheckCircle2 size={20}/> },
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
          <h2 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">Próximos Vencimentos</h2>
          <div className="flex items-center gap-2">
             <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400">
               <Filter size={18} />
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic">Carregando lançamentos...</td>
                </tr>
              ) : lancamentos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic font-medium">
                    Nenhuma conta a pagar encontrada. Clique em "Novo Título" para começar.
                  </td>
                </tr>
              ) : (
                lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-brand-primary transition-colors">{l.descricao}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">{l.parceiro?.nome || 'Fornecedor avulso'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                        <Calendar size={14} />
                        {new Date(l.data_vencimento).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-4 font-black text-slate-900 dark:text-white">
                      R$ {l.valor_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-4">
                      {getStatusBadge(l.status)}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {l.status === 'ABERTO' && (
                          <button 
                            onClick={() => {
                              setSelectedLancamento(l);
                              setIsLiquidacaoOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            Baixar
                          </button>
                        )}
                        <button className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-500">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modais */}
      <LiquidacaoModal 
        isOpen={isLiquidacaoOpen}
        onClose={() => setIsLiquidacaoOpen(false)}
        lancamento={selectedLancamento}
        onSuccess={fetchLancamentos}
      />
    </div>
  );
};

export default ContasPagar;
