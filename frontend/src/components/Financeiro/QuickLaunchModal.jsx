import React, { useState, useEffect } from 'react';
import { X, Zap, TrendingDown, TrendingUp, DollarSign, Calendar, Tag, User, Layers, Loader2, Check, CreditCard } from 'lucide-react';
import { api } from '../../lib/api';

/* ===========================
   MODAL PRINCIPAL
=========================== */
const QuickLaunchModal = ({ isOpen, onClose, onSuccess, initialNatureza = 'PAGAR' }) => {

  const [loading, setLoading] = useState(false);
  const [regras, setRegras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [showNovoParceiro, setShowNovoParceiro] = useState(false);

  const [formData, setFormData] = useState({
    descricao: '',
    valor_previsto: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    natureza: initialNatureza,
    tipo: 'PROVISAO',
    tipo_evento: '',
    plano_contas_id: '',
    parceiro_id: '',
    centro_custo_id: '',
    forma_pagamento_id: '',
  });

  /* ===========================
     CARREGAMENTO INICIAL
  =========================== */
  useEffect(() => {
    if (isOpen) {
      setFormData({
        descricao: '',
        valor_previsto: '',
        data_vencimento: new Date().toISOString().split('T')[0],
        natureza: initialNatureza,
        tipo: 'PROVISAO',
        tipo_evento: '',
        plano_contas_id: '',
        parceiro_id: '',
        centro_custo_id: '',
        forma_pagamento_id: '',
      });

      fetchData();
    }
  }, [isOpen, initialNatureza]);

  const fetchData = async () => {
    try {
      const [regrasRes, parceirosRes, formasRes] = await Promise.all([
        api.get('/accounting/rules'),
        api.get('/parceiros/'),
        api.get('/financeiro/formas-pagamento')
      ]);

      setRegras(regrasRes.data);
      setParceiros(parceirosRes.data);
      setFormasPagamento(formasRes.data);

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  /* ===========================
     SUBMIT
  =========================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        descricao: formData.descricao,
        valor_previsto: parseFloat(formData.valor_previsto),
        data_vencimento: formData.data_vencimento,
        natureza: formData.natureza,
        tipo: formData.tipo,
        tipo_evento: formData.tipo_evento || null,
        plano_contas_id: formData.plano_contas_id || null,
        parceiro_id: formData.parceiro_id || null,
        centro_custo_id: formData.centro_custo_id || null,
        documento: formData.documento || null,
        forma_pagamento_id: formData.forma_pagamento_id || null,
      };

      await api.post('/financeiro/', payload);

      if (onSuccess) onSuccess();

      window.dispatchEvent(new CustomEvent('financeiro-updated'));
      onClose();

    } catch (err) {
      console.error('ERRO COMPLETO DA API:', err);
      
      let errorMsg = 'Erro desconhecido ao salvar';
      
      if (err.response?.data) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          errorMsg = detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join('\n');
        } else if (typeof detail === 'object') {
          errorMsg = JSON.stringify(detail, null, 2);
        } else {
          errorMsg = JSON.stringify(err.response.data, null, 2);
        }
      } else {
        errorMsg = err.message;
      }
      
      alert('Erro ao criar lançamento:\n\n' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  /* ===========================
     RENDER
  =========================== */
  const inputClass = "w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400";
  const labelClass = "flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Overlay com desfoque e escurecimento graduado */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - Force text-slate-900 to avoid dark mode inheritance */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3 text-slate-900">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Zap size={18} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter">Lançamento Rápido</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Novo Título Financeiro</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          
          {/* Natureza / Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                formData.natureza === 'PAGAR' 
                ? 'bg-white text-red-600 shadow-sm border border-red-100' 
                : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
              }`}
              onClick={() => setFormData({ ...formData, natureza: 'PAGAR' })}
            >
              <TrendingDown size={14} />
              Pagar
            </button>

            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                formData.natureza === 'RECEBER' 
                ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
              onClick={() => setFormData({ ...formData, natureza: 'RECEBER' })}
            >
              <TrendingUp size={14} />
              Receber
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Descrição - Full Width */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                <Tag size={12} className="text-blue-500" />
                Descrição do Título
              </label>
              <input
                required
                placeholder="Ex: Aluguel Mensal, Venda de Produto..."
                className={inputClass}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            {/* Valor */}
            <div>
              <label className={labelClass}>
                <DollarSign size={12} className="text-emerald-500" />
                Valor Previsto
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  className={`${inputClass} pl-9`}
                  value={formData.valor_previsto}
                  onChange={(e) => setFormData({ ...formData, valor_previsto: e.target.value })}
                />
              </div>
            </div>

            {/* Data */}
            <div>
              <label className={labelClass}>
                <Calendar size={12} className="text-orange-500" />
                Data de Vencimento
              </label>
              <input
                type="date"
                required
                className={`${inputClass} appearance-none cursor-pointer`}
                style={{ minHeight: '44px' }}
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
              />
            </div>

            {/* Tipo de Evento / Regra */}
            <div>
              <label className={labelClass}>
                <Layers size={12} className="text-purple-500" />
                Categoria / Evento
              </label>
              <select
                required
                className={`${inputClass} cursor-pointer`}
                value={formData.tipo_evento}
                onChange={(e) => setFormData({ ...formData, tipo_evento: e.target.value })}
              >
                <option value="" className="text-slate-400">Selecione o evento</option>
                {regras
                  .filter(r => r.natureza === formData.natureza)
                  .map((r) => (
                    <option key={r.id} value={r.tipo_evento}>
                      {r.tipo_evento.replace(/_/g, ' ')}
                    </option>
                  ))}
              </select>
            </div>

            {/* Parceiro */}
            <div>
              <label className={labelClass}>
                <User size={12} className="text-indigo-500" />
                Parceiro (Opcional)
              </label>
              <select
                className={`${inputClass} cursor-pointer`}
                value={formData.parceiro_id}
                onChange={(e) => setFormData({ ...formData, parceiro_id: e.target.value })}
              >
                <option value="">Consumidor Final / Geral</option>
                {parceiros.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome_razao}
                  </option>
                ))}
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className={labelClass}>
                <CreditCard size={12} className="text-sky-500" />
                Forma de Pagamento (Opcional)
              </label>
              <select
                className={`${inputClass} cursor-pointer`}
                value={formData.forma_pagamento_id}
                onChange={(e) => setFormData({ ...formData, forma_pagamento_id: e.target.value })}
              >
                <option value="">— Não especificado —</option>
                {formasPagamento.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer / Ações */}
          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>

            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Processando...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Registrar Título
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default QuickLaunchModal;