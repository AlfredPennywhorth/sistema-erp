import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Search, Plus, Loader2, AlertCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { ContabilidadeAPI } from '../../lib/contabilidade';
import { FinanceiroAPI } from '../../lib/financeiro';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const STATUS_COLOR = {
  ABERTO: 'bg-yellow-500/20 text-yellow-300',
  CONCILIADO: 'bg-emerald-500/20 text-emerald-300',
  CANCELADO: 'bg-red-500/20 text-red-300',
};

export default function LancamentosContabeis() {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = today.toISOString().slice(0, 10);

  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataInicio, setDataInicio] = useState(firstDay);
  const [dataFim, setDataFim] = useState(lastDay);
  const [expandedLote, setExpandedLote] = useState(null);
  const [loteDetail, setLoteDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal novo lançamento
  const [showModal, setShowModal] = useState(false);
  const [contas, setContas] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [form, setForm] = useState({
    data: lastDay,
    historico: '',
    documento_referencia: '',
    partidas: [
      { conta_id: '', valor: '', debito_credito: 'D' },
      { conta_id: '', valor: '', debito_credito: 'C' },
    ],
  });
  const [modalError, setModalError] = useState(null);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;
      const data = await ContabilidadeAPI.getLotes(params);
      setLotes(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erro ao carregar lançamentos.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    fetchLotes();
  }, []);

  useEffect(() => {
    if (showModal && contas.length === 0) {
      FinanceiroAPI.getPlanoContas().then((data) => {
        setContas(Array.isArray(data) ? data.filter((c) => c.is_analitica && c.ativo) : []);
      });
    }
  }, [showModal]);

  const toggleLote = async (loteId) => {
    if (expandedLote === loteId) {
      setExpandedLote(null);
      setLoteDetail(null);
      return;
    }
    setExpandedLote(loteId);
    setLoadingDetail(true);
    try {
      const detail = await ContabilidadeAPI.getLote(loteId);
      setLoteDetail(detail);
    } catch {
      setLoteDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const addPartida = () =>
    setForm((f) => ({
      ...f,
      partidas: [...f.partidas, { conta_id: '', valor: '', debito_credito: 'D' }],
    }));

  const removePartida = (idx) =>
    setForm((f) => ({
      ...f,
      partidas: f.partidas.filter((_, i) => i !== idx),
    }));

  const updatePartida = (idx, field, value) =>
    setForm((f) => ({
      ...f,
      partidas: f.partidas.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));

  const somaDebitos = form.partidas
    .filter((p) => p.debito_credito === 'D')
    .reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const somaCreditos = form.partidas
    .filter((p) => p.debito_credito === 'C')
    .reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const isBalanced = Math.abs(somaDebitos - somaCreditos) < 0.01;

  const submitLancamento = async () => {
    setModalError(null);
    if (!form.historico) return setModalError('Histórico é obrigatório.');
    if (!isBalanced) return setModalError(`Desequilíbrio: Débitos ${fmt(somaDebitos)} ≠ Créditos ${fmt(somaCreditos)}`);
    if (form.partidas.some((p) => !p.conta_id || !p.valor))
      return setModalError('Preencha todas as partidas (conta e valor).');

    setModalLoading(true);
    try {
      const payload = {
        data: form.data,
        historico: form.historico,
        documento_referencia: form.documento_referencia || null,
        partidas: form.partidas.map((p) => ({
          conta_id: p.conta_id,
          valor: parseFloat(p.valor),
          debito_credito: p.debito_credito,
        })),
      };
      await ContabilidadeAPI.criarLancamento(payload);
      setShowModal(false);
      setForm({
        data: lastDay,
        historico: '',
        documento_referencia: '',
        partidas: [
          { conta_id: '', valor: '', debito_credito: 'D' },
          { conta_id: '', valor: '', debito_credito: 'C' },
        ],
      });
      fetchLotes();
    } catch (err) {
      setModalError(err?.response?.data?.detail || 'Erro ao criar lançamento.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-500/10 rounded-2xl">
            <BookOpen className="text-violet-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Lançamentos Contábeis</h1>
            <p className="text-sm text-slate-400">Livro Diário — Partidas Dobradas</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-sm"
        >
          <Plus size={16} />
          Novo Lançamento
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
            />
          </div>
          <button
            onClick={fetchLotes}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Filtrar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Lista de Lotes */}
      <div className="space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-violet-400" />
          </div>
        )}
        {!loading && lotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <BookOpen size={40} className="opacity-30" />
            <p className="text-sm">Nenhum lançamento contábil no período.</p>
            <p className="text-xs">Lançamentos são criados automaticamente ao liquidar operações financeiras.</p>
          </div>
        )}
        {!loading && lotes.map((lote) => (
          <div key={lote.id} className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
            <button
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors text-left"
              onClick={() => toggleLote(lote.id)}
            >
              {expandedLote === lote.id ? (
                <ChevronDown size={16} className="text-violet-400 flex-shrink-0" />
              ) : (
                <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{lote.historico}</p>
                <p className="text-slate-400 text-xs">{lote.data_lancamento} • {lote.modulo_origem}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {lote.documento_referencia && (
                  <span className="text-xs text-slate-500 font-mono">{lote.documento_referencia}</span>
                )}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLOR[lote.status] ?? 'bg-slate-700 text-slate-300'}`}>
                  {lote.status}
                </span>
              </div>
            </button>

            {expandedLote === lote.id && (
              <div className="border-t border-white/5 px-5 py-4 bg-slate-900/40">
                {loadingDetail ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-violet-400" />
                  </div>
                ) : loteDetail ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/5">
                        <th className="text-left pb-2 pr-4">Conta</th>
                        <th className="text-left pb-2 pr-4">Nome</th>
                        <th className="text-right pb-2 pr-4 text-blue-400">Débito</th>
                        <th className="text-right pb-2 text-emerald-400">Crédito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loteDetail.partidas.map((p) => (
                        <tr key={p.id} className="border-b border-white/3 py-1">
                          <td className="py-2 pr-4 font-mono text-slate-400">{p.conta_codigo}</td>
                          <td className="py-2 pr-4 text-white">{p.conta_nome}</td>
                          <td className="py-2 pr-4 text-right text-blue-400 font-mono">
                            {p.debito_credito === 'D' ? fmt(p.valor) : '—'}
                          </td>
                          <td className="py-2 text-right text-emerald-400 font-mono">
                            {p.debito_credito === 'C' ? fmt(p.valor) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-slate-500 text-xs">Detalhes indisponíveis.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Novo Lançamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-lg font-black text-white">Novo Lançamento Contábil</h2>
              <button
                onClick={() => { setShowModal(false); setModalError(null); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Data *</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                    className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Documento</label>
                  <input
                    type="text"
                    placeholder="Ex: NF-001, Contrato-X"
                    value={form.documento_referencia}
                    onChange={(e) => setForm((f) => ({ ...f, documento_referencia: e.target.value }))}
                    className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold">Histórico *</label>
                <input
                  type="text"
                  placeholder="Descrição do lançamento..."
                  value={form.historico}
                  onChange={(e) => setForm((f) => ({ ...f, historico: e.target.value }))}
                  className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500"
                />
              </div>

              {/* Partidas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Partidas</label>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-blue-400">Débitos: {fmt(somaDebitos)}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-emerald-400">Créditos: {fmt(somaCreditos)}</span>
                    <span className={`font-bold ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isBalanced ? '✓ Equilibrado' : '✗ Desequilibrado'}
                    </span>
                  </div>
                </div>
                {form.partidas.map((p, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-800 rounded-xl p-3">
                    <select
                      value={p.debito_credito}
                      onChange={(e) => updatePartida(idx, 'debito_credito', e.target.value)}
                      className={`bg-transparent font-bold text-xs uppercase px-2 py-1 rounded-lg border ${p.debito_credito === 'D' ? 'border-blue-500/30 text-blue-400' : 'border-emerald-500/30 text-emerald-400'}`}
                    >
                      <option value="D">D</option>
                      <option value="C">C</option>
                    </select>
                    <select
                      value={p.conta_id}
                      onChange={(e) => updatePartida(idx, 'conta_id', e.target.value)}
                      className="flex-1 bg-slate-700 text-white text-xs rounded-lg px-3 py-2 border border-white/5"
                    >
                      <option value="">Selecionar conta...</option>
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo_estruturado} — {c.nome}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="0,00"
                      value={p.valor}
                      onChange={(e) => updatePartida(idx, 'valor', e.target.value)}
                      className="w-28 bg-slate-700 text-white text-xs rounded-lg px-3 py-2 border border-white/5 text-right"
                      min="0"
                      step="0.01"
                    />
                    {form.partidas.length > 2 && (
                      <button
                        onClick={() => removePartida(idx)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addPartida}
                  className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <Plus size={14} />
                  Adicionar Partida
                </button>
              </div>

              {modalError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">
                  <AlertCircle size={14} />
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowModal(false); setModalError(null); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitLancamento}
                  disabled={modalLoading || !isBalanced}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  {modalLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {modalLoading ? 'Salvando...' : 'Criar Lançamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
