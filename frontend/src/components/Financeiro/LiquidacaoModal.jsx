import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Landmark, Calendar, DollarSign } from 'lucide-react';
import { api } from '../../lib/api';

const LiquidacaoModal = ({ isOpen, onClose, lancamento, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [contas, setContas] = useState([]);
  const [formData, setFormData] = useState({
    valor_pago: 0,
    data_pagamento: new Date().toISOString().split('T')[0],
    conta_bancaria_id: ''
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchContas();
      if (lancamento) {
        setFormData(prev => ({
          ...prev,
          valor_pago: lancamento.valor_previsto
        }));
      }
      setError(null);
    }
  }, [isOpen, lancamento]);

  const fetchContas = async () => {
    try {
      const response = await api.get('/financeiro/contas-bancarias');
      setContas(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, conta_bancaria_id: response.data[0].id }));
      }
    } catch (err) {
      console.error("Erro ao carregar contas:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(`/financeiro/${lancamento.id}/liquidar`, {
        valor_pago: formData.valor_pago,
        data_pagamento: formData.data_pagamento,
        conta_bancaria_id: formData.conta_bancaria_id
      });
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao realizar liquidação.";
      setError(Array.isArray(msg) ? msg[0].msg : msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Liquidar Título</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{lancamento?.descricao}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-600 animate-in shake duration-300">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {/* Conta Bancária */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Landmark size={12} />
                Conta de Destino / Origem
              </label>
              <select
                required
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={formData.conta_bancaria_id}
                onChange={(e) => setFormData({...formData, conta_bancaria_id: e.target.value})}
              >
                {contas.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} (Saldo: R$ {c.saldo_atual.toLocaleString('pt-BR')})</option>
                ))}
              </select>
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign size={12} />
                  Valor Pago
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  value={formData.valor_pago}
                  onChange={(e) => setFormData({...formData, valor_pago: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} />
                  Data Pagamento
                </label>
                <input
                  type="date"
                  required
                  className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  value={formData.data_pagamento}
                  onChange={(e) => setFormData({...formData, data_pagamento: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-12 bg-emerald-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Processando..." : "Confirmar Baixa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LiquidacaoModal;
