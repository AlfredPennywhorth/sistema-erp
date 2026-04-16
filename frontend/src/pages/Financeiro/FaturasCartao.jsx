import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, X, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Calendar, DollarSign, Landmark } from 'lucide-react';
import { FinanceiroAPI } from '../../lib/financeiro';

const STATUS_LABELS = {
  ABERTA: { label: 'Aberta', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  FECHADA: { label: 'Fechada', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PAGA: { label: 'Paga', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
  CANCELADA: { label: 'Cancelada', color: 'bg-slate-200 text-slate-500 border-slate-300' },
};

const LABEL_MES = (mesRef) => {
  if (!mesRef) return '';
  const [ano, mes] = mesRef.split('-');
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${nomes[parseInt(mes, 10) - 1]} / ${ano}`;
};

function PagarFaturaModal({ fatura, contas, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    conta_bancaria_id: contas.length > 0 ? contas[0].id : '',
    data_pagamento: new Date().toISOString().split('T')[0],
    desconto: 0,
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await FinanceiroAPI.pagarFaturaCartao(fatura.id, {
        conta_bancaria_id: formData.conta_bancaria_id,
        data_pagamento: formData.data_pagamento,
        desconto: parseFloat(formData.desconto) || 0,
      });
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao pagar fatura.';
      setError(Array.isArray(msg) ? msg[0].msg : msg);
    } finally {
      setLoading(false);
    }
  };

  const valorFinal = parseFloat(fatura.valor_total) - (parseFloat(formData.desconto) || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500"><CheckCircle2 size={22} /></div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Pagar Fatura</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{LABEL_MES(fatura.mes_referencia)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-600">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Landmark size={12} /> Conta de Débito
            </label>
            <select
              required
              className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-primary outline-none"
              value={formData.conta_bancaria_id}
              onChange={(e) => setFormData({ ...formData, conta_bancaria_id: e.target.value })}
            >
              {contas.map(c => (
                <option key={c.id} value={c.id}>{c.nome} — Saldo: R$ {parseFloat(c.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> Data do Pagamento
              </label>
              <input
                type="date" required
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                value={formData.data_pagamento}
                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={12} /> Desconto (R$)
              </label>
              <input
                type="number" step="0.01" min="0"
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-400 outline-none"
                value={formData.desconto}
                onChange={(e) => setFormData({ ...formData, desconto: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Valor a Pagar</span>
            <span className="text-xl font-black text-red-500">
              R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading || contas.length === 0}
              className="flex-[2] h-12 bg-red-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FaturaRow({ fatura, formasPagamento, contas, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [lancamentos, setLancamentos] = useState([]);
  const [loadingLanc, setLoadingLanc] = useState(false);
  const [showPagar, setShowPagar] = useState(false);

  const forma = formasPagamento.find(f => f.id === fatura.forma_pagamento_id);
  const statusInfo = STATUS_LABELS[fatura.status] || STATUS_LABELS.ABERTA;

  const handleExpand = async () => {
    if (!expanded && lancamentos.length === 0) {
      setLoadingLanc(true);
      try {
        const data = await FinanceiroAPI.getLancamentosFatura(fatura.id);
        setLancamentos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLanc(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors group">
        <td className="p-4">
          <button onClick={handleExpand} className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="font-bold text-slate-800 dark:text-white">{LABEL_MES(fatura.mes_referencia)}</span>
          </button>
        </td>
        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{forma?.nome || '—'}</td>
        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
          {fatura.data_vencimento ? new Date(fatura.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
        </td>
        <td className="p-4 text-right font-bold text-slate-800 dark:text-white">
          R$ {parseFloat(fatura.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </td>
        <td className="p-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </td>
        <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          {(fatura.status === 'ABERTA' || fatura.status === 'FECHADA') && (
            <button
              onClick={() => setShowPagar(true)}
              className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-600 transition-all"
            >
              Pagar Fatura
            </button>
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-white/5 px-8 py-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Compras na Fatura</p>
              {loadingLanc ? (
                <p className="text-sm text-slate-400">Carregando...</p>
              ) : lancamentos.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Nenhuma compra registrada nesta fatura.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="pb-2 text-left">Descrição</th>
                      <th className="pb-2 text-left">Data Venc.</th>
                      <th className="pb-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {lancamentos.map(l => (
                      <tr key={l.id}>
                        <td className="py-2 text-slate-700 dark:text-slate-300">{l.descricao}</td>
                        <td className="py-2 text-slate-500">
                          {l.data_vencimento ? new Date(l.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 text-right font-bold text-slate-800 dark:text-white">
                          R$ {parseFloat(l.valor_previsto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}

      {showPagar && (
        <PagarFaturaModal
          fatura={fatura}
          contas={contas}
          onClose={() => setShowPagar(false)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}

export default function FaturasCartao() {
  const [faturas, setFaturas] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const [faturasData, formasData, contasData] = await Promise.all([
        FinanceiroAPI.getFaturasCartao(),
        FinanceiroAPI.getFormasPagamento(),
        FinanceiroAPI.getContasBancarias(),
      ]);
      setFaturas(faturasData);
      setFormasPagamento(formasData);
      setContas(contasData);
    } catch (err) {
      console.error('Erro ao carregar faturas:', err);
    } finally {
      setLoading(false);
    }
  };

  const faturasFiltradas = filtroStatus
    ? faturas.filter(f => f.status === filtroStatus)
    : faturas;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-primary" />
            Faturas de Cartão
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie as faturas dos cartões de crédito da empresa</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 text-sm font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-brand-primary outline-none"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="ABERTA">Abertas</option>
            <option value="FECHADA">Fechadas</option>
            <option value="PAGA">Pagas</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
              <th className="p-4 border-b border-slate-200 dark:border-white/5">Mês de Referência</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5">Cartão</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5">Vencimento</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5 text-right">Total</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5">Status</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-sm">
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-20"></div></td>
                  ))}
                </tr>
              ))
            ) : faturasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p>Nenhuma fatura encontrada.</p>
                    <p className="text-xs text-slate-400">As faturas são criadas automaticamente ao registrar compras com Cartão de Crédito.</p>
                  </div>
                </td>
              </tr>
            ) : (
              faturasFiltradas.map(fatura => (
                <FaturaRow
                  key={fatura.id}
                  fatura={fatura}
                  formasPagamento={formasPagamento}
                  contas={contas}
                  onRefresh={fetchDados}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
