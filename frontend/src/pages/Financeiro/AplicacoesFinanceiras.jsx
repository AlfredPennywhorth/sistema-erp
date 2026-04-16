import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PlusCircle,
  RefreshCw,
  Landmark,
  ChevronDown,
  ChevronUp,
  DollarSign,
  BarChart2,
  Calendar,
  ArrowDownLeft,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';

const TIPO_LABELS = {
  CDB: 'CDB',
  LCI: 'LCI',
  LCA: 'LCA',
  POUPANCA: 'Poupança',
  TESOURO_DIRETO: 'Tesouro Direto',
  FUNDO_INVESTIMENTO: 'Fundo de Invest.',
  DEBENTURE: 'Debênture',
  OUTROS: 'Outros',
};

const STATUS_COLORS = {
  ATIVA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  RESGATADA: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  VENCIDA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CANCELADA: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const fmt = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (value) =>
  `${Number(value || 0).toFixed(2)}%`;

// ---------------------------------------------------------------------------
// Modal: Nova Aplicação
// ---------------------------------------------------------------------------
const ModalNovaAplicacao = ({ isOpen, onClose, contas, planoContas, onSuccess }) => {
  const [form, setForm] = useState({
    nome: '',
    tipo: 'CDB',
    instituicao: '',
    conta_bancaria_origem_id: '',
    valor_aplicado: '',
    taxa_rendimento: '',
    data_aplicacao: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    conta_contabil_aplicacao_id: '',
    conta_contabil_receita_id: '',
    conta_contabil_despesa_id: '',
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        valor_aplicado: parseFloat(form.valor_aplicado),
        taxa_rendimento: form.taxa_rendimento ? parseFloat(form.taxa_rendimento) : null,
        data_vencimento: form.data_vencimento || null,
      };
      await api.post('/aplicacoes/', payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar aplicação.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const ativoContas = planoContas.filter((c) => c.tipo === 'ATIVO' && c.is_analitica);
  const receitaContas = planoContas.filter((c) => c.tipo === 'RECEITA' && c.is_analitica);
  const despesaContas = planoContas.filter((c) => c.tipo === 'DESPESA' && c.is_analitica);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Nova Aplicação Financeira</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome da Aplicação *</label>
              <input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                placeholder="Ex: CDB Banco XP"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo *</label>
              <select
                required
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
              >
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Instituição</label>
              <input
                value={form.instituicao}
                onChange={(e) => setForm({ ...form, instituicao: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                placeholder="Ex: Banco XP"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conta Bancária Origem *</label>
              <select
                required
                value={form.conta_bancaria_origem_id}
                onChange={(e) => setForm({ ...form, conta_bancaria_origem_id: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
              >
                <option value="">Selecione...</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} — {fmt(c.saldo_atual)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Aplicado (R$) *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.valor_aplicado}
                onChange={(e) => setForm({ ...form, valor_aplicado: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa (% a.a.)</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={form.taxa_rendimento}
                onChange={(e) => setForm({ ...form, taxa_rendimento: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                placeholder="Ex: 12.5"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data de Aplicação *</label>
              <input
                required
                type="date"
                value={form.data_aplicacao}
                onChange={(e) => setForm({ ...form, data_aplicacao: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data de Vencimento</label>
              <input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Vínculos Contábeis */}
          <div className="pt-2">
            <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-3">Vínculo Contábil Obrigatório</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conta Contábil da Aplicação (ATIVO) *</label>
                <select
                  required
                  value={form.conta_contabil_aplicacao_id}
                  onChange={(e) => setForm({ ...form, conta_contabil_aplicacao_id: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                >
                  <option value="">Selecione uma conta de ATIVO...</option>
                  {ativoContas.map((c) => (
                    <option key={c.id} value={c.id}>{c.codigo_estruturado} — {c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conta Contábil de Receita (Rendimentos) *</label>
                <select
                  required
                  value={form.conta_contabil_receita_id}
                  onChange={(e) => setForm({ ...form, conta_contabil_receita_id: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                >
                  <option value="">Selecione uma conta de RECEITA...</option>
                  {receitaContas.map((c) => (
                    <option key={c.id} value={c.id}>{c.codigo_estruturado} — {c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conta Contábil de Despesa (IR / IOF) *</label>
                <select
                  required
                  value={form.conta_contabil_despesa_id}
                  onChange={(e) => setForm({ ...form, conta_contabil_despesa_id: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                >
                  <option value="">Selecione uma conta de DESPESA...</option>
                  {despesaContas.map((c) => (
                    <option key={c.id} value={c.id}>{c.codigo_estruturado} — {c.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</label>
            <textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-brand-primary text-white font-black text-xs uppercase tracking-widest hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Criando...' : 'Criar Aplicação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modal: Registrar Rendimento
// ---------------------------------------------------------------------------
const ModalRendimento = ({ isOpen, onClose, aplicacao, onSuccess }) => {
  const [form, setForm] = useState({
    data_rendimento: new Date().toISOString().split('T')[0],
    valor_rendimento: '',
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/aplicacoes/${aplicacao.id}/registrar-rendimento`, {
        ...form,
        valor_rendimento: parseFloat(form.valor_rendimento),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao registrar rendimento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !aplicacao) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Registrar Rendimento</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
            <p className="text-xs text-slate-400">Aplicação: <span className="text-white font-bold">{aplicacao.nome}</span></p>
            <p className="text-xs text-slate-400 mt-1">Saldo Atual: <span className="text-emerald-400 font-bold">{fmt(aplicacao.saldo_atual)}</span></p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data do Rendimento *</label>
            <input
              required
              type="date"
              value={form.data_rendimento}
              onChange={(e) => setForm({ ...form, data_rendimento: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor do Rendimento (R$) *</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.valor_rendimento}
              onChange={(e) => setForm({ ...form, valor_rendimento: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</label>
            <textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modal: Resgatar
// ---------------------------------------------------------------------------
const ModalResgate = ({ isOpen, onClose, aplicacao, contas, onSuccess }) => {
  const [form, setForm] = useState({
    tipo: 'TOTAL',
    data_resgate: new Date().toISOString().split('T')[0],
    valor_bruto: '',
    ir_retido: '0',
    iof_retido: '0',
    conta_bancaria_destino_id: '',
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const valorLiquido =
    (parseFloat(form.valor_bruto) || 0) -
    (parseFloat(form.ir_retido) || 0) -
    (parseFloat(form.iof_retido) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/aplicacoes/${aplicacao.id}/resgatar`, {
        ...form,
        valor_bruto: parseFloat(form.valor_bruto),
        ir_retido: parseFloat(form.ir_retido) || 0,
        iof_retido: parseFloat(form.iof_retido) || 0,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao processar resgate.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !aplicacao) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Resgatar Aplicação</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
            <p className="text-xs text-slate-400">Aplicação: <span className="text-white font-bold">{aplicacao.nome}</span></p>
            <p className="text-xs text-slate-400 mt-1">Saldo Disponível: <span className="text-amber-400 font-bold">{fmt(aplicacao.saldo_atual)}</span></p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Resgate *</label>
            <select
              required
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
            >
              <option value="TOTAL">Total</option>
              <option value="PARCIAL">Parcial</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data do Resgate *</label>
            <input
              required
              type="date"
              value={form.data_resgate}
              onChange={(e) => setForm({ ...form, data_resgate: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Bruto do Resgate (R$) *</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              max={aplicacao.saldo_atual}
              value={form.valor_bruto}
              onChange={(e) => setForm({ ...form, valor_bruto: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
              placeholder="0,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IR Retido (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.ir_retido}
                onChange={(e) => setForm({ ...form, ir_retido: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IOF Retido (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.iof_retido}
                onChange={(e) => setForm({ ...form, iof_retido: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Prévia do valor líquido */}
          <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Valor Líquido</span>
            <span className={`text-sm font-black ${valorLiquido > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmt(valorLiquido)}
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conta Destino *</label>
            <select
              required
              value={form.conta_bancaria_destino_id}
              onChange={(e) => setForm({ ...form, conta_bancaria_destino_id: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
            >
              <option value="">Selecione...</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-widest hover:bg-amber-600 disabled:opacity-50 transition-colors">
              {loading ? 'Processando...' : 'Confirmar Resgate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Card de Aplicação
// ---------------------------------------------------------------------------
const AplicacaoCard = ({ aplicacao, onRendimento, onResgate }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden transition-all">
      <div
        className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-primary/10 px-2 py-0.5 rounded-full border border-brand-primary/20">
                {TIPO_LABELS[aplicacao.tipo] || aplicacao.tipo}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_COLORS[aplicacao.status]}`}>
                {aplicacao.status}
              </span>
            </div>
            <h3 className="text-white font-black text-base mt-2 truncate">{aplicacao.nome}</h3>
            {aplicacao.instituicao && (
              <p className="text-slate-400 text-xs mt-0.5">{aplicacao.instituicao}</p>
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Saldo Atual</p>
            <p className="text-xl font-black text-emerald-400">{fmt(aplicacao.saldo_atual)}</p>
          </div>

          <div className="text-slate-500 mt-1">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Aplicado</p>
            <p className="text-sm font-bold text-slate-300">{fmt(aplicacao.valor_aplicado)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Rendimento Total</p>
            <p className="text-sm font-bold text-emerald-400">+{fmt(aplicacao.rendimento_total)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Rentabilidade</p>
            <p className="text-sm font-bold text-brand-primary">{fmtPct(aplicacao.rendimento_percentual)}</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Data Aplicação</p>
              <p className="text-slate-300 font-medium">{aplicacao.data_aplicacao}</p>
            </div>
            {aplicacao.data_vencimento && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Vencimento</p>
                <p className="text-slate-300 font-medium">{aplicacao.data_vencimento}</p>
              </div>
            )}
            {aplicacao.taxa_rendimento && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Taxa (a.a.)</p>
                <p className="text-slate-300 font-medium">{fmtPct(aplicacao.taxa_rendimento)}</p>
              </div>
            )}
            {aplicacao.conta_bancaria_nome && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Conta Origem</p>
                <p className="text-slate-300 font-medium">{aplicacao.conta_bancaria_nome}</p>
              </div>
            )}
          </div>

          {aplicacao.status === 'ATIVA' && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onRendimento(aplicacao)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
              >
                <TrendingUp size={14} />
                Registrar Rendimento
              </button>
              <button
                onClick={() => onResgate(aplicacao)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-xs uppercase tracking-widest hover:bg-amber-500/20 transition-colors"
              >
                <ArrowDownLeft size={14} />
                Resgatar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const AplicacoesFinanceiras = () => {
  const [aplicacoes, setAplicacoes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [contas, setContas] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFiltro, setStatusFiltro] = useState('ATIVA');
  const [modalNova, setModalNova] = useState(false);
  const [modalRendimento, setModalRendimento] = useState(null);
  const [modalResgate, setModalResgate] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = statusFiltro ? { status_filtro: statusFiltro } : {};
      const [apRes, resumoRes, contasRes, pcRes] = await Promise.all([
        api.get('/aplicacoes/', { params }),
        api.get('/aplicacoes/dashboard/resumo'),
        api.get('/financeiro/contas-bancarias'),
        api.get('/financeiro/plano-contas'),
      ]);
      setAplicacoes(apRes.data);
      setResumo(resumoRes.data);
      setContas(contasRes.data);
      setPlanoContas(pcRes.data);
    } catch (err) {
      console.error('Erro ao carregar aplicações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFiltro]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Aplicações Financeiras</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão separada do caixa operacional • Vínculos contábeis obrigatórios</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setModalNova(true)}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all"
          >
            <PlusCircle size={16} />
            Nova Aplicação
          </button>
        </div>
      </div>

      {/* Dashboard Cards */}
      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><Landmark size={18} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Total</span>
            </div>
            <p className="text-2xl font-black text-emerald-400">{fmt(resumo.saldo_total_aplicacoes)}</p>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary"><DollarSign size={18} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Aplicado</span>
            </div>
            <p className="text-2xl font-black text-brand-primary">{fmt(resumo.valor_aplicado_total)}</p>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400"><TrendingUp size={18} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rendimentos</span>
            </div>
            <p className="text-2xl font-black text-indigo-400">+{fmt(resumo.rendimento_total_acumulado)}</p>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400"><BarChart2 size={18} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rentabilidade</span>
            </div>
            <p className="text-2xl font-black text-amber-400">{fmtPct(resumo.rentabilidade_percentual)}</p>
            <p className="text-[10px] text-slate-500 mt-1">{resumo.quantidade_ativas} aplicações ativas</p>
          </div>
        </div>
      )}

      {/* Filtro de Status */}
      <div className="flex items-center gap-2">
        {['ATIVA', 'RESGATADA', 'VENCIDA', ''].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFiltro(s)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
              statusFiltro === s
                ? 'bg-brand-primary text-white'
                : 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {s || 'Todas'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
        </div>
      ) : aplicacoes.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Landmark size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold text-sm uppercase tracking-widest">Nenhuma aplicação encontrada</p>
          <p className="text-xs mt-1">Crie sua primeira aplicação financeira para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {aplicacoes.map((a) => (
            <AplicacaoCard
              key={a.id}
              aplicacao={a}
              onRendimento={setModalRendimento}
              onResgate={setModalResgate}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      <ModalNovaAplicacao
        isOpen={modalNova}
        onClose={() => setModalNova(false)}
        contas={contas}
        planoContas={planoContas}
        onSuccess={fetchData}
      />
      <ModalRendimento
        isOpen={!!modalRendimento}
        onClose={() => setModalRendimento(null)}
        aplicacao={modalRendimento}
        onSuccess={fetchData}
      />
      <ModalResgate
        isOpen={!!modalResgate}
        onClose={() => setModalResgate(null)}
        aplicacao={modalResgate}
        contas={contas}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default AplicacoesFinanceiras;
