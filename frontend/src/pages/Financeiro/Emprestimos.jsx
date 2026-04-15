import React, { useState, useEffect, useCallback } from 'react';
import {
  Banknote,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  X,
  Building2,
  Calendar,
  Percent,
  ListOrdered,
} from 'lucide-react';
import { api } from '../../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

const STATUS_CONFIG = {
  ATIVO:        { label: 'Ativo',        icon: Clock,          color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  QUITADO:      { label: 'Quitado',      icon: CheckCircle2,   color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
  INADIMPLENTE: { label: 'Inadimplente', icon: AlertCircle,    color: 'text-rose-400',   bg: 'bg-rose-500/10'   },
  CANCELADO:    { label: 'Cancelado',    icon: XCircle,        color: 'text-slate-400',  bg: 'bg-slate-500/10'  },
};

const PARCELA_CONFIG = {
  PENDENTE:  { label: 'Pendente',  color: 'text-amber-400' },
  PAGA:      { label: 'Paga',      color: 'text-emerald-400' },
  ATRASADA:  { label: 'Atrasada',  color: 'text-rose-400' },
  CANCELADA: { label: 'Cancelada', color: 'text-slate-400' },
};

// ─── Modal Pagar Parcela ─────────────────────────────────────────────────────

const ModalPagarParcela = ({ parcela, emprestimo, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    conta_bancaria_id: '',
    data_pagamento: new Date().toISOString().split('T')[0],
    valor_pago: String(parcela.valor_total),
  });
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/financeiro/contas-bancarias').then(r => setContas(r.data || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(
        `/emprestimos/${emprestimo.id}/parcelas/${parcela.id}/pagar`,
        {
          conta_bancaria_id: form.conta_bancaria_id,
          data_pagamento: form.data_pagamento,
          valor_pago: parseFloat(form.valor_pago),
        }
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao registrar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-white">
            Pagar Parcela {parcela.numero_parcela}/{emprestimo.numero_parcelas}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-slate-400 text-xs mb-1">Vencimento</p>
            <p className="font-bold text-white">{fmtDate(parcela.data_vencimento)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-slate-400 text-xs mb-1">Valor Total</p>
            <p className="font-bold text-white">{fmt(parcela.valor_total)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-slate-400 text-xs mb-1">Principal</p>
            <p className="font-bold text-emerald-400">{fmt(parcela.valor_principal)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-slate-400 text-xs mb-1">Juros</p>
            <p className="font-bold text-rose-400">{fmt(parcela.valor_juros)}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
              Conta Bancária *
            </label>
            <select
              required
              value={form.conta_bancaria_id}
              onChange={e => setForm({ ...form, conta_bancaria_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary"
            >
              <option value="">Selecione...</option>
              {contas.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
              Data do Pagamento *
            </label>
            <input
              type="date"
              required
              value={form.data_pagamento}
              onChange={e => setForm({ ...form, data_pagamento: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
              Valor Pago (R$) *
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              value={form.valor_pago}
              onChange={e => setForm({ ...form, valor_pago: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-brand-primary text-white text-sm font-black uppercase tracking-wider hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal Novo Empréstimo ───────────────────────────────────────────────────

const ModalNovoEmprestimo = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    conta_bancaria_id: '',
    conta_contabil_passivo_id: '',
    conta_contabil_juros_id: '',
    parceiro_id: '',
    valor_contratado: '',
    taxa_juros: '',
    tipo_juros: 'COMPOSTO',
    tipo_amortizacao: 'PRICE',
    data_contratacao: new Date().toISOString().split('T')[0],
    data_primeira_parcela: '',
    numero_parcelas: '12',
    periodicidade_dias: '30',
    carencia_dias: '0',
    descricao: '',
    numero_contrato: '',
    observacoes: '',
  });

  const [contas, setContas] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/financeiro/contas-bancarias'),
      api.get('/financeiro/plano-contas'),
      api.get('/parceiros'),
    ]).then(([cb, pc, pa]) => {
      setContas(cb.data || []);
      setPlanoContas(pc.data || []);
      setParceiros(pa.data || []);
    });
  }, []);

  const contasPassivo = planoContas.filter(c => c.tipo === 'PASSIVO' && c.is_analitica && c.ativo);
  const contasDespesa = planoContas.filter(c => c.tipo === 'DESPESA' && c.is_analitica && c.ativo);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        valor_contratado: parseFloat(form.valor_contratado),
        taxa_juros: parseFloat(form.taxa_juros) / 100,
        numero_parcelas: parseInt(form.numero_parcelas),
        periodicidade_dias: parseInt(form.periodicidade_dias),
        carencia_dias: parseInt(form.carencia_dias),
        parceiro_id: form.parceiro_id || undefined,
      };
      await api.post('/emprestimos/', payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar empréstimo.');
    } finally {
      setLoading(false);
    }
  };

  const F = ({ label, children }) => (
    <div>
      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-white">Novo Empréstimo / Financiamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <F label="Conta Bancária Receptora *">
              <select required value={form.conta_bancaria_id} onChange={e => setForm({ ...form, conta_bancaria_id: e.target.value })} className={inputCls}>
                <option value="">Selecione...</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </F>
            <F label="Credor / Instituição">
              <select value={form.parceiro_id} onChange={e => setForm({ ...form, parceiro_id: e.target.value })} className={inputCls}>
                <option value="">Nenhum (opcional)</option>
                {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome_razao}</option>)}
              </select>
            </F>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <F label="Conta Contábil — Passivo *">
              <select required value={form.conta_contabil_passivo_id} onChange={e => setForm({ ...form, conta_contabil_passivo_id: e.target.value })} className={inputCls}>
                <option value="">Selecione conta PASSIVO...</option>
                {contasPassivo.map(c => <option key={c.id} value={c.id}>{c.codigo_estruturado} — {c.nome}</option>)}
              </select>
            </F>
            <F label="Conta Contábil — Juros *">
              <select required value={form.conta_contabil_juros_id} onChange={e => setForm({ ...form, conta_contabil_juros_id: e.target.value })} className={inputCls}>
                <option value="">Selecione conta DESPESA...</option>
                {contasDespesa.map(c => <option key={c.id} value={c.id}>{c.codigo_estruturado} — {c.nome}</option>)}
              </select>
            </F>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <F label="Valor Contratado (R$) *">
              <input type="number" required step="0.01" min="0.01" placeholder="0,00" value={form.valor_contratado} onChange={e => setForm({ ...form, valor_contratado: e.target.value })} className={inputCls} />
            </F>
            <F label="Taxa de Juros (% ao período) *">
              <input type="number" required step="0.0001" min="0" placeholder="1.2 = 1,2%" value={form.taxa_juros} onChange={e => setForm({ ...form, taxa_juros: e.target.value })} className={inputCls} />
            </F>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <F label="Tipo de Juros">
              <select value={form.tipo_juros} onChange={e => setForm({ ...form, tipo_juros: e.target.value })} className={inputCls}>
                <option value="COMPOSTO">Composto</option>
                <option value="SIMPLES">Simples</option>
              </select>
            </F>
            <F label="Sistema Amortização">
              <select value={form.tipo_amortizacao} onChange={e => setForm({ ...form, tipo_amortizacao: e.target.value })} className={inputCls}>
                <option value="PRICE">Price (prestação fixa)</option>
                <option value="SAC">SAC (amortização const.)</option>
                <option value="LIVRE">Livre / Bullet</option>
              </select>
            </F>
            <F label="Nº de Parcelas *">
              <input type="number" required min="1" value={form.numero_parcelas} onChange={e => setForm({ ...form, numero_parcelas: e.target.value })} className={inputCls} />
            </F>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <F label="Data Contratação *">
              <input type="date" required value={form.data_contratacao} onChange={e => setForm({ ...form, data_contratacao: e.target.value })} className={inputCls} />
            </F>
            <F label="1ª Parcela *">
              <input type="date" required value={form.data_primeira_parcela} onChange={e => setForm({ ...form, data_primeira_parcela: e.target.value })} className={inputCls} />
            </F>
            <F label="Periodicidade (dias)">
              <input type="number" min="1" value={form.periodicidade_dias} onChange={e => setForm({ ...form, periodicidade_dias: e.target.value })} className={inputCls} />
            </F>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <F label="Nº Contrato">
              <input type="text" placeholder="Opcional" value={form.numero_contrato} onChange={e => setForm({ ...form, numero_contrato: e.target.value })} className={inputCls} />
            </F>
            <F label="Descrição">
              <input type="text" placeholder="Ex: Empréstimo Banco X – Capital de Giro" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className={inputCls} />
            </F>
          </div>

          <F label="Observações">
            <textarea rows={2} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className={inputCls} />
          </F>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-brand-primary text-white text-sm font-black uppercase tracking-wider hover:bg-brand-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar Empréstimo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Card de Empréstimo ───────────────────────────────────────────────────────

const EmprestimoCard = ({ emp, onPagarParcela }) => {
  const [expanded, setExpanded] = useState(false);
  const [parcelas, setParcelas] = useState([]);
  const [loadingParcelas, setLoadingParcelas] = useState(false);
  const cfg = STATUS_CONFIG[emp.status] || STATUS_CONFIG.ATIVO;
  const StatusIcon = cfg.icon;

  const loadParcelas = useCallback(async () => {
    if (parcelas.length > 0) return;
    setLoadingParcelas(true);
    try {
      const res = await api.get(`/emprestimos/${emp.id}/parcelas`);
      setParcelas(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingParcelas(false);
    }
  }, [emp.id, parcelas.length]);

  const handleExpand = () => {
    if (!expanded) loadParcelas();
    setExpanded(!expanded);
  };

  const refreshParcelas = async () => {
    setLoadingParcelas(true);
    try {
      const res = await api.get(`/emprestimos/${emp.id}/parcelas`);
      setParcelas(res.data || []);
    } finally {
      setLoadingParcelas(false);
    }
  };

  const pctQuitado = emp.valor_contratado > 0
    ? Math.round((1 - emp.saldo_devedor / emp.valor_contratado) * 100)
    : 0;

  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header do Card */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.color}`}>
                <StatusIcon size={11} />
                {cfg.label}
              </span>
              {emp.numero_contrato && (
                <span className="text-xs text-slate-500 font-medium">{emp.numero_contrato}</span>
              )}
            </div>
            <h3 className="text-base font-bold text-white truncate">
              {emp.descricao || `Empréstimo — ${fmtDate(emp.data_contratacao)}`}
            </h3>
            {emp.parceiro_nome && (
              <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Building2 size={13} /> {emp.parceiro_nome}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Saldo Devedor</p>
            <p className="text-xl font-black text-white">{fmt(emp.saldo_devedor)}</p>
            <p className="text-xs text-slate-500">de {fmt(emp.valor_contratado)}</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Progresso de Quitação</span>
            <span>{pctQuitado}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pctQuitado}%` }}
            />
          </div>
        </div>

        {/* Meta-info */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Percent size={10} /> Taxa
            </p>
            <p className="text-sm font-bold text-white">
              {(parseFloat(emp.taxa_juros) * 100).toFixed(4)}% / {emp.periodicidade_dias === 30 ? 'mês' : `${emp.periodicidade_dias}d`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <ListOrdered size={10} /> Parcelas
            </p>
            <p className="text-sm font-bold text-white">{emp.numero_parcelas}x — {emp.tipo_amortizacao}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Calendar size={10} /> Contratação
            </p>
            <p className="text-sm font-bold text-white">{fmtDate(emp.data_contratacao)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Calendar size={10} /> Vencimento
            </p>
            <p className="text-sm font-bold text-white">{fmtDate(emp.data_vencimento_final)}</p>
          </div>
        </div>

        {/* Expandir Parcelas */}
        <button
          onClick={handleExpand}
          className="mt-4 w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Ocultar parcelas' : 'Ver cronograma de parcelas'}
        </button>
      </div>

      {/* Tabela de Parcelas */}
      {expanded && (
        <div className="border-t border-white/5 px-6 pb-4">
          {loadingParcelas ? (
            <div className="py-6 text-center text-slate-500 text-sm">Carregando...</div>
          ) : (
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="text-left pb-2 font-black">#</th>
                  <th className="text-left pb-2 font-black">Vencimento</th>
                  <th className="text-right pb-2 font-black">Principal</th>
                  <th className="text-right pb-2 font-black">Juros</th>
                  <th className="text-right pb-2 font-black">Total</th>
                  <th className="text-center pb-2 font-black">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map(p => {
                  const pcfg = PARCELA_CONFIG[p.status] || PARCELA_CONFIG.PENDENTE;
                  const canPay = p.status === 'PENDENTE' || p.status === 'ATRASADA';
                  return (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-white/3">
                      <td className="py-2.5 text-slate-400">{p.numero_parcela}</td>
                      <td className="py-2.5 text-white">{fmtDate(p.data_vencimento)}</td>
                      <td className="py-2.5 text-right text-slate-300">{fmt(p.valor_principal)}</td>
                      <td className="py-2.5 text-right text-rose-400">{fmt(p.valor_juros)}</td>
                      <td className="py-2.5 text-right font-bold text-white">{fmt(p.valor_total)}</td>
                      <td className="py-2.5 text-center">
                        <span className={`text-xs font-bold ${pcfg.color}`}>{pcfg.label}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        {canPay && (
                          <button
                            onClick={() => onPagarParcela(p, refreshParcelas)}
                            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-lg transition-colors"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────

const Emprestimos = () => {
  const [emprestimos, setEmprestimos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parcelaToPay, setParcelaToPay] = useState(null); // { parcela, emprestimo, onRefresh }
  const [statusFiltro, setStatusFiltro] = useState('');

  const fetchEmprestimos = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFiltro ? { status_filtro: statusFiltro } : {};
      const res = await api.get('/emprestimos/', { params });
      setEmprestimos(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar empréstimos:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFiltro]);

  useEffect(() => {
    fetchEmprestimos();
  }, [fetchEmprestimos]);

  // Totais
  const totalContratado = emprestimos.reduce((s, e) => s + parseFloat(e.valor_contratado || 0), 0);
  const totalSaldoDevedor = emprestimos.reduce((s, e) => s + parseFloat(e.saldo_devedor || 0), 0);
  const ativos = emprestimos.filter(e => e.status === 'ATIVO').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Empréstimos & Financiamentos</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão de passivos financeiros com cronograma de amortização</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all"
        >
          <Plus size={16} />
          Novo Empréstimo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Contratado',   value: fmt(totalContratado),   icon: Banknote,    color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: 'Saldo Devedor Total',value: fmt(totalSaldoDevedor), icon: AlertCircle, color: 'text-rose-400',   bg: 'bg-rose-500/10' },
          { label: 'Contratos Ativos',   value: ativos,                 icon: Clock,       color: 'text-amber-400',  bg: 'bg-amber-500/10' },
        ].map(k => (
          <div key={k.label} className="bg-slate-900 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${k.bg}`}>
              <k.icon size={20} className={k.color} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-black">{k.label}</p>
              <p className="text-xl font-black text-white mt-0.5">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtro de Status */}
      <div className="flex gap-2">
        {['', 'ATIVO', 'QUITADO', 'INADIMPLENTE', 'CANCELADO'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFiltro(s)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
              statusFiltro === s
                ? 'bg-brand-primary text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {s || 'Todos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Carregando empréstimos...</div>
      ) : emprestimos.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-white/10 rounded-2xl">
          <Banknote size={48} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400 font-bold">Nenhum empréstimo encontrado</p>
          <p className="text-slate-600 text-sm mt-1">Clique em "Novo Empréstimo" para registrar um contrato</p>
        </div>
      ) : (
        <div className="space-y-4">
          {emprestimos.map(emp => (
            <EmprestimoCard
              key={emp.id}
              emp={emp}
              onPagarParcela={(parcela, onRefresh) =>
                setParcelaToPay({ parcela, emprestimo: emp, onRefresh })
              }
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {isModalOpen && (
        <ModalNovoEmprestimo
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchEmprestimos}
        />
      )}
      {parcelaToPay && (
        <ModalPagarParcela
          parcela={parcelaToPay.parcela}
          emprestimo={parcelaToPay.emprestimo}
          onClose={() => setParcelaToPay(null)}
          onSuccess={() => {
            parcelaToPay.onRefresh();
            fetchEmprestimos();
          }}
        />
      )}
    </div>
  );
};

export default Emprestimos;
