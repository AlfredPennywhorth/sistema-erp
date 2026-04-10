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
  Calendar
} from 'lucide-react';
import { api } from '../../lib/api';

const Tesouraria = () => {
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState([]);
  const [extrato, setExtrato] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contasRes, extratoRes] = await Promise.all([
        api.get('/financeiro/contas-bancarias'),
        api.get('/financeiro/extrato')
      ]);
      setContas(contasRes.data);
      setExtrato(extratoRes.data);
    } catch (err) {
      console.error("Erro ao carregar tesouraria:", err);
    } finally {
      setLoading(false);
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
          <div key={conta.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group">
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
              R$ {conta.saldo_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan="4" className="px-8 py-12 text-center text-slate-400 italic">Carregando movimentações...</td></tr>
              ) : extrato.length === 0 ? (
                <tr>
                   <td colSpan="4" className="px-8 py-12 text-center">
                     <div className="flex flex-col items-center gap-3">
                        <TrendingUp size={32} className="text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">Nenhuma movimentação realizada ainda.</p>
                     </div>
                   </td>
                </tr>
              ) : (
                extrato.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-4 text-xs font-bold text-slate-500">
                      {new Date(m.data_pagamento).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{m.descricao}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black">{m.parceiro_nome || 'Lançamento Direto'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                       <span className="text-[10px] font-black px-2 py-1 bg-slate-100 dark:bg-white/5 rounded text-slate-500">
                         {m.conta_nome}
                       </span>
                    </td>
                    <td className={`px-8 py-4 text-right font-black ${m.valor_pago < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {m.valor_pago < 0 ? '-' : '+'} R$ {Math.abs(m.valor_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Tesouraria;
