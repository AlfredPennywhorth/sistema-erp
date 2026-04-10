import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ChevronRight, ChevronDown, 
  Folder, FileText, Loader2, Plus, 
  Pencil, Trash2, Power, X, Check,
  AlertCircle
} from 'lucide-react';
import { FinanceiroAPI } from '../../lib/financeiro';

export default function PlanoContas() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    codigo_estruturado: '',
    nome: '',
    tipo: 'ATIVO',
    natureza: 'DEVEDORA',
    is_analitica: true,
    ativo: true,
    parent_id: ''
  });

  useEffect(() => {
    fetchContas();
  }, []);

  async function fetchContas() {
    setLoading(true);
    try {
      const data = await FinanceiroAPI.getPlanoContas();
      if (Array.isArray(data)) {
        const sortedData = [...data].sort((a, b) => 
          (a.codigo_estruturado || '').localeCompare(b.codigo_estruturado || '')
        );
        setContas(sortedData);
      }
    } catch (error) {
      console.error("Erro ao carregar plano de contas:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- CRUD Handlers ---

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        codigo_estruturado: account.codigo_estruturado,
        nome: account.nome,
        tipo: account.tipo,
        natureza: account.natureza,
        is_analitica: account.is_analitica,
        ativo: account.ativo,
        parent_id: account.parent_id || ''
      });
    } else {
      setEditingAccount(null);
      setFormData({
        codigo_estruturado: '',
        nome: '',
        tipo: 'ATIVO',
        natureza: 'DEVEDORA',
        is_analitica: true,
        ativo: true,
        parent_id: ''
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError(null);
    try {
      if (editingAccount) {
        await FinanceiroAPI.updatePlanoConta(editingAccount.id, formData);
      } else {
        await FinanceiroAPI.createPlanoConta({
          ...formData,
          parent_id: formData.parent_id || null
        });
      }
      await fetchContas();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao salvar conta contábil.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta conta?")) return;
    try {
      await FinanceiroAPI.deletePlanoConta(id);
      await fetchContas();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao excluir conta.";
      alert(msg);
    }
  };

  const toggleAtivo = async (account) => {
    try {
      await FinanceiroAPI.updatePlanoConta(account.id, { ativo: !account.ativo });
      await fetchContas();
    } catch (err) {
      alert("Erro ao alterar status da conta.");
    }
  };

  // --- Business Logic: Sugestão de Código ---

  useEffect(() => {
    // Só sugere código se for uma nova conta e houver um pai selecionado
    if (!formData.parent_id || editingAccount) return;

    const pai = contas.find(c => c.id === formData.parent_id);
    if (!pai) return;

    // Encontrar filhos diretos do pai para sugerir o próximo
    const filhos = contas.filter(c => c.parent_id === pai.id);
    const sufixos = filhos.map(f => {
      const partes = f.codigo_estruturado.split('.');
      return parseInt(partes[partes.length - 1], 10);
    }).filter(n => !isNaN(n));

    const proximo = sufixos.length > 0 ? Math.max(...sufixos) + 1 : 1;
    const sufixoFormatado = proximo.toString().padStart(2, '0');
    const novoCodigo = `${pai.codigo_estruturado}.${sufixoFormatado}`;

    // Evita loop infinito: só atualiza se o código sugerido for diferente do atual
    if (formData.codigo_estruturado !== novoCodigo) {
      setFormData(prev => ({
        ...prev,
        codigo_estruturado: novoCodigo,
        tipo: pai.tipo,
        natureza: pai.natureza
      }));
    }
  }, [formData.parent_id, editingAccount, contas, formData.codigo_estruturado]);

  // --- UI Helpers ---

  const toggleCollapse = (id) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const contasMap = useMemo(() => {
    return contas.reduce((acc, conta) => {
      acc[conta.id] = conta;
      return acc;
    }, {});
  }, [contas]);

  const isAnyAncestorCollapsed = (contaId) => {
    let current = contasMap[contaId];
    let depth = 0;
    while (current && current.parent_id && depth < 15) {
      if (collapsedIds.has(current.parent_id)) return true;
      current = contasMap[current.parent_id];
      depth++;
    }
    return false;
  };

  const filteredAndVisibleContas = useMemo(() => {
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      return contas.filter(c => 
        c.nome.toLowerCase().includes(lowerSearch) || 
        c.codigo_estruturado.includes(lowerSearch)
      );
    }
    return contas.filter(conta => !isAnyAncestorCollapsed(conta.id));
  }, [contas, collapsedIds, searchTerm, contasMap]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-primary" />
        <p className="tracking-widest text-sm uppercase">Carregando plano de contas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header e Busca */}
        <div className="p-6 border-b border-slate-200 dark:border-white/5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Estrutura Contábil</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie a hierarquia de contas analíticas e sintéticas.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar conta..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-brand-primary/50 text-sm transition-colors"
                />
              </div>
              <button 
                onClick={() => handleOpenModal()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
              >
                <Plus size={16} />
                Nova Conta
              </button>
            </div>
          </div>
        </div>

        {/* Home of Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">Código e Nome</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Natureza</th>
                <th className="px-6 py-4">Analítica</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.02]">
              <AnimatePresence>
                {filteredAndVisibleContas.length > 0 ? (
                  filteredAndVisibleContas.map((conta) => {
                    const nivel = conta.codigo_estruturado.split('.').length;
                    const paddingLeft = `${(nivel - 1) * 2}rem`;
                    const isCollapsed = collapsedIds.has(conta.id);

                    return (
                      <motion.tr
                        key={conta.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`group hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors ${!conta.ativo ? 'opacity-40 grayscale-[50%]' : ''}`}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3" style={{ paddingLeft }}>
                            {!conta.is_analitica ? (
                              <button 
                                onClick={() => toggleCollapse(conta.id)}
                                className={`p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-primary transition-colors`}
                              >
                                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              </button>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-2"></div>
                            )}
                            <div className="flex flex-col">
                              <span className={`font-mono text-xs ${!conta.is_analitica ? 'font-black text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                {conta.codigo_estruturado}
                              </span>
                              <span className={`text-sm ${!conta.is_analitica ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                {conta.nome}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                            conta.tipo === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' :
                            conta.tipo === 'PASSIVO' ? 'bg-rose-500/10 text-rose-600' :
                            'bg-blue-500/10 text-blue-600'
                          }`}>
                            {conta.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-500">{conta.natureza}</td>
                        <td className="px-6 py-3">
                          {conta.is_analitica ? (
                            <FileText size={14} className="text-slate-400" />
                          ) : (
                            <Folder size={14} className="text-brand-primary" />
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-block w-2 h-2 rounded-full ${conta.ativo ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenModal(conta)}
                              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => toggleAtivo(conta)}
                              className={`p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all ${conta.ativo ? 'text-slate-500 hover:text-amber-500' : 'text-amber-500 hover:text-emerald-500'}`}
                              title={conta.ativo ? "Inativar" : "Ativar"}
                            >
                              <Power size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(conta.id)}
                              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-rose-500 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 italic">Nenhuma conta encontrada.</td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">
                    {editingAccount ? 'Editar Conta' : 'Nova Conta Contábil'}
                  </h3>
                  <p className="text-xs text-slate-500">Preencha os dados da estrutura funcional.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X size={20}/></button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-2 text-rose-600 text-xs font-medium">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Conta Pai (Opcional)</label>
                    <select 
                      value={formData.parent_id}
                      onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                      disabled={!!editingAccount}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary"
                    >
                      <option value="">Nenhuma (Nível Raiz)</option>
                      {contas.filter(c => !c.is_analitica).map(c => (
                        <option key={c.id} value={c.id}>{c.codigo_estruturado} - {c.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Código Estruturado</label>
                    <input 
                      type="text" required
                      placeholder="Ex: 1.1.01"
                      value={formData.codigo_estruturado}
                      onChange={(e) => setFormData({...formData, codigo_estruturado: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nome da Conta</label>
                    <input 
                      type="text" required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tipo</label>
                    <select 
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="PASSIVO">Passivo</option>
                      <option value="RECEITA">Receita</option>
                      <option value="DESPESA">Despesa</option>
                      <option value="PATRIMONIO">Patrimônio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Natureza</label>
                    <select 
                      value={formData.natureza}
                      onChange={(e) => setFormData({...formData, natureza: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary"
                    >
                      <option value="DEVEDORA">Devedora</option>
                      <option value="CREDORA">Credora</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input 
                      type="checkbox" 
                      id="is_analitica"
                      checked={formData.is_analitica}
                      onChange={(e) => setFormData({...formData, is_analitica: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <label htmlFor="is_analitica" className="text-sm text-slate-600 dark:text-slate-400 font-medium">Conta Analítica (Aceita lançamentos)</label>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input 
                      type="checkbox" 
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <label htmlFor="ativo" className="text-sm text-slate-600 dark:text-slate-400 font-medium">Ativo</label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={modalLoading}
                    className="px-8 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {modalLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
