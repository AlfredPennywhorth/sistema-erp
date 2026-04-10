import React, { useState, useEffect } from 'react';
import { X, Zap, DollarSign, Calendar, Tag, User, Layers, Building2 } from 'lucide-react';
import { api } from '../../lib/api';

const QuickLaunchModal = ({ isOpen, onClose, onSuccess, initialNatureza = 'PAGAR' }) => {
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [formData, setFormData] = useState({
    descricao: '',
    valor_previsto: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    natureza: initialNatureza,
    tipo: 'PROVISAO',
    plano_contas_id: '',
    parceiro_id: '',
    centro_custo: '', // ✅ FASE 4: Centro de Custo adicionado
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ 
        ...prev, 
        natureza: initialNatureza,
        descricao: '',
        valor_previsto: '',
        data_vencimento: new Date().toISOString().split('T')[0],
      }));
      fetchData();
    }
  }, [isOpen, initialNatureza]);

  const fetchData = async () => {
    try {
      const [planosRes, parceirosRes] = await Promise.all([
        api.get('/financeiro/plano-contas'),
        api.get('/parceiros/')
      ]);
      setPlanos(planosRes.data);
      setParceiros(parceirosRes.data);
      
      // Busca a primeira conta que faça sentido para a natureza
      if (planosRes.data.length > 0) {
        setFormData(prev => ({ ...prev, plano_contas_id: planosRes.data[0].id }));
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/financeiro/', {
        ...formData,
        valor_previsto: parseFloat(formData.valor_previsto),
        parceiro_id: formData.parceiro_id || null,
        centro_custo: formData.centro_custo || null // ✅ FASE 4
      });
      
      if (onSuccess) onSuccess();
      window.dispatchEvent(new CustomEvent('financeiro-updated'));
      onClose();
      
      // O reset agora é feito no useEffect ao abrir, mas limpamos aqui por segurança
      setFormData({
        descricao: '',
        valor_previsto: '',
        data_vencimento: new Date().toISOString().split('T')[0],
        natureza: initialNatureza,
        tipo: 'PROVISAO',
        plano_contas_id: planos[0]?.id || '',
        parceiro_id: '',
        centro_custo: '', // ✅ FASE 4
      });
    } catch (err) {
      alert("Erro ao criar lançamento: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-brand-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Lançamento Rápido</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Pressione ESC para sair</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-2 gap-6">
            {/* Natureza e Tipo */}
            <div className="col-span-2 flex gap-4 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl">
              <button
                type="button"
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.natureza === 'PAGAR' ? 'bg-white dark:bg-slate-800 text-red-500 shadow-sm' : 'text-slate-500'}`}
                onClick={() => setFormData({...formData, natureza: 'PAGAR'})}
              >
                Contas a Pagar
              </button>
              <button
                type="button"
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.natureza === 'RECEBER' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-500'}`}
                onClick={() => setFormData({...formData, natureza: 'RECEBER'})}
              >
                Contas a Receber
              </button>
            </div>

            {/* Descrição */}
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Tag size={12} />
                Descrição do Lançamento
              </label>
              <input
                autoFocus
                required
                placeholder="Ex: Aluguel Mensal, Pagamento Fornecedor X..."
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              />
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={12} />
                Valor Previsto
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.valor_previsto}
                onChange={(e) => setFormData({...formData, valor_previsto: e.target.value})}
              />
            </div>

            {/* Vencimento */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} />
                Data de Vencimento
              </label>
              <input
                type="date"
                required
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
              />
            </div>

            {/* Plano de Contas */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={12} />
                Classificação (Plano)
              </label>
              <select
                required
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.plano_contas_id}
                onChange={(e) => setFormData({...formData, plano_contas_id: e.target.value})}
              >
                {planos.map(p => (
                  <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>
                ))}
              </select>
            </div>

            {/* Parceiro */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={12} />
                Parceiro (Opcional)
              </label>
              <select
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.parceiro_id}
                onChange={(e) => setFormData({...formData, parceiro_id: e.target.value})}
              >
                <option value="">Nenhum parceiro vinculado</option>
                {parceiros.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            {/* Centro de Custo */}
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} />
                Centro de Custo (Opcional)
              </label>
              <select
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.centro_custo}
                onChange={(e) => setFormData({...formData, centro_custo: e.target.value})}
              >
                <option value="">Sem Centro de Custo</option>
                <option value="ADMINISTRATIVO">Administrativo</option>
                <option value="COMERCIAL">Comercial</option>
                <option value="FINANCEIRO">Financeiro</option>
                <option value="OPERACIONAL">Operacional</option>
                <option value="RH">Recursos Humanos</option>
                <option value="TI">Tecnologia da Informação</option>
                <option value="MARKETING">Marketing</option>
              </select>
            </div>
          </div>

          <div className="mt-10 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-14 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-14 bg-brand-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} />
              {loading ? "Gravando..." : "Finalizar Lançamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickLaunchModal;
