import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Landmark, Calendar, DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { api } from '../../lib/api';

const LiquidacaoModal = ({ isOpen, onClose, lancamento, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [contas, setContas] = useState([]);
  const [formData, setFormData] = useState({
    valor_pago: 0,
    juros_multa: 0,
    desconto: 0,
    data_pagamento: new Date().toISOString().split('T')[0],
    conta_bancaria_id: ''
  });
  const [error, setError] = useState(null);

  const valorLiquido = () => {
    const pago = parseFloat(formData.valor_pago) || 0;
    const juros = parseFloat(formData.juros_multa) || 0;
    const desc = parseFloat(formData.desconto) || 0;
    return pago + juros - desc;
  };

  useEffect(() => {
    if (isOpen) {
      fetchContas();
      if (lancamento) {
        setFormData(prev => ({
          ...prev,
          valor_pago: lancamento.valor_previsto,
          juros_multa: 0,
          desconto: 0,
          data_pagamento: new Date().toISOString().split('T')[0],
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
      console.error('Erro ao carregar contas:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(`/financeiro/${lancamento.id}/liquidar`, {
        valor_pago: parseFloat(formData.valor_pago),
        juros_multa: parseFloat(formData.juros_multa) || 0,
        desconto: parseFloat(formData.desconto) || 0,
        data_pagamento: formData.data_pagamento,
        conta_bancaria_id: formData.conta_bancaria_id
      });
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao realizar liquidação.';
      setError(Array.isArray(msg) ? msg[0].msg : msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isPagar = lancamento?.natureza === 'PAGAR';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className={`px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between ${
          isPagar ? 'bg-red-500/5' : 'bg-emerald-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              isPagar ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600'
            }`}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isPagar ? 'Baixar Pagamento' : 'Confirmar Recebimento'}
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{lancamento?.descricao}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-600">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Conta Bancária */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Landmark size={12} />
              Conta de {isPagar ? 'Débito' : 'Crédito'}
            </label>
            {contas.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs font-bold text-amber-600">
                ⚠️ Nenhuma conta bancária cadastrada. Cadastre uma em Tesouraria antes de baixar.
              </div>
            ) : (
              <select
                required
                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={formData.conta_bancaria_id}
                onChange={(e) => setFormData({ ...formData, conta_bancaria_id: e.target.value })}
              >
                {contas.map(c => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800">
                    {c.nome} — Saldo: R$ {parseFloat(c.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Valor Principal e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={12} />
                Valor do Título
              </label>
              <input
                type="number" step="0.01" required
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={formData.valor_pago}
                onChange={(e) => setFormData({ ...formData, valor_pago: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} />
                Data do Pagamento
              </label>
              <input
                type="date" required
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={formData.data_pagamento}
                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
              />
            </div>
          </div>

          {/* Juros/Multa e Desconto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={12} className="text-red-400" />
                Juros / Multa
              </label>
              <input
                type="number" step="0.01" min="0"
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-red-500 focus:ring-2 focus:ring-red-400 outline-none transition-all"
                value={formData.juros_multa}
                onChange={(e) => setFormData({ ...formData, juros_multa: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingDown size={12} className="text-emerald-400" />
                Desconto
              </label>
              <input
                type="number" step="0.01" min="0"
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-emerald-500 focus:ring-2 focus:ring-emerald-400 outline-none transition-all"
                value={formData.desconto}
                onChange={(e) => setFormData({ ...formData, desconto: e.target.value })}
              />
            </div>
          </div>

          {/* Resumo do Valor Líquido */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isPagar
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-emerald-500/5 border-emerald-500/20'
          }`}>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Valor Líquido a {isPagar ? 'Pagar' : 'Receber'}</span>
            <span className={`text-xl font-black ${
              isPagar ? 'text-red-500' : 'text-emerald-500'
            }`}>
              R$ {valorLiquido().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 h-12 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading || contas.length === 0}
              className={`flex-[2] h-12 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                isPagar
                  ? 'bg-red-500 shadow-red-500/20'
                  : 'bg-emerald-500 shadow-emerald-500/20'
              }`}>
              {loading ? 'Processando...' : `Confirmar ${isPagar ? 'Pagamento' : 'Recebimento'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LiquidacaoModal;
