import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ChevronRight, ChevronDown, 
  Folder, FileText, Loader2, Plus, 
  Pencil, Trash2, Power, X, Check,
  AlertCircle, Layers
} from 'lucide-react';
import { FinanceiroAPI } from '../../lib/financeiro';

export default function CentrosCusto() {
  const [centros, setCentros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCC, setEditingCC] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    tipo: 'ANALITICO',
    is_active: true,
    parent_id: ''
  });

  useEffect(() => {
    fetchCentros();
  }, []);

  async function fetchCentros() {
    setLoading(true);
    try {
      const data = await FinanceiroAPI.getCentrosCusto();
      if (Array.isArray(data)) {
        // Ordenação por código para lógica hierárquica visual
        const sortedData = [...data].sort((a, b) => 
          (a.codigo || '').localeCompare(b.codigo || '')
        );
        setCentros(sortedData);
      }
    } catch (error) {
      console.error("Erro ao carregar centros de custo:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- CRUD Handlers ---

  const handleOpenModal = (cc = null) => {
    if (cc) {
      setEditingCC(cc);
      setFormData({
        codigo: cc.codigo,
        nome: cc.nome,
        tipo: cc.tipo || 'ANALITICO',
        is_active: cc.is_active,
        parent_id: cc.parent_id || ''
      });
    } else {
      setEditingCC(null);
      setFormData({
        codigo: '',
        nome: '',
        tipo: 'ANALITICO',
        is_active: true,
        parent_id: ''
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setModalLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        parent_id: formData.parent_id || null
      };

      if (editingCC) {
        await FinanceiroAPI.updateCentroCusto(editingCC.id, payload);
      } else {
        await FinanceiroAPI.createCentroCusto(payload);
      }
      await fetchCentros();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao salvar centro de custo.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este Centro de Custo?")) return;
    try {
      await FinanceiroAPI.deleteCentroCusto(id);
      await fetchCentros();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao excluir centro de custo.";
      alert(msg);
    }
  };

  const toggleStatus = async (cc) => {
    try {
      await FinanceiroAPI.updateCentroCusto(cc.id, { is_active: !cc.is_active });
      await fetchCentros();
    } catch (err) {
      alert("Erro ao alterar status.");
    }
  };

  // --- UI Helpers ---

  const toggleCollapse = (id) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const centrosMap = useMemo(() => {
    return centros.reduce((acc, cc) => {
      acc[cc.id] = cc;
      return acc;
    }, {});
  }, [centros]);

  // Função para determinar a profundidade de um centro (para padding)
  const getDepth = (ccId) => {
    let depth = 0;
    let current = centrosMap[ccId];
    while (current && current.parent_id && depth < 10) {
      depth++;
      current = centrosMap[current.parent_id];
    }
    return depth;
  };

  const isAnyAncestorCollapsed = (ccId) => {
    let current = centrosMap[ccId];
    let safety = 0;
    while (current && current.parent_id && safety < 10) {
      if (collapsedIds.has(current.parent_id)) return true;
      current = centrosMap[current.parent_id];
      safety++;
    }
    return false;
  };

  const filteredAndVisibleCentros = useMemo(() => {
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      return centros.filter(c => 
        c.nome.toLowerCase().includes(lowerSearch) || 
        c.codigo.toLowerCase().includes(lowerSearch)
      );
    }
    return centros.filter(cc => !isAnyAncestorCollapsed(cc.id));
  }, [centros, collapsedIds, searchTerm, centrosMap]);

  // --- Business Logic: Sugestão de Código ---

  useEffect(() => {
    if (formData.parent_id && !editingCC) {
      const pai = centros.find(c => c.id === formData.parent_id);
      if (pai) {
        const filhos = centros.filter(c => c.parent_id === pai.id);
        const sufixos = filhos.map(f => {
          const partes = f.codigo.split('.');
          const lastPart = partes[partes.length - 1];
          return parseInt(lastPart, 10);
        }).filter(n => !isNaN(n));

        const proximo = sufixos.length > 0 ? Math.max(...sufixos) + 1 : 1;
        
        setFormData(prev => ({
          ...prev,
          codigo: `${pai.codigo}.${proximo}`,
          tipo: 'ANALITICO'
        }));
      }
    }
  }, [formData.parent_id, editingCC, centros]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isModalOpen && e.key === 'Enter' && !e.shiftKey) {
        if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, formData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-primary" />
        <p className="tracking-widest text-sm uppercase">Carregando centros de custo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header e Busca */}
        <div className="p-6 border-b border-slate-200 dark:border-white/5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Centros de Custo</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Dimensões para análise de rentabilidade e gastos.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar centro..." 
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
                Novo Centro
              </button>
            </div>
          </div>
        </div>

        {/* Home of Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">Código e Descrição</th>
                <th className="px-6 py-4">Tipo Estrutura</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.02]">
              <AnimatePresence>
                {filteredAndVisibleCentros.length > 0 ? (
                  filteredAndVisibleCentros.map((cc) => {
                    const depth = getDepth(cc.id);
                    const paddingLeft = `${depth * 2}rem`;
                    const isCollapsed = collapsedIds.has(cc.id);
                    const hasChildren = centros.some(child => child.parent_id === cc.id);

                    return (
                      <motion.tr
                        key={cc.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`group hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors ${!cc.is_active ? 'opacity-40 grayscale-[50%]' : ''}`}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3" style={{ paddingLeft }}>
                            {hasChildren ? (
                              <button 
                                onClick={() => toggleCollapse(cc.id)}
                                className={`p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-primary transition-colors`}
                              >
                                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              </button>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-2"></div>
                            )}
                            <div className="flex flex-col">
                              <span className={`font-mono text-xs ${hasChildren ? 'font-black text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                {cc.codigo}
                              </span>
                              <span className={`text-sm ${hasChildren ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                {cc.nome}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            {cc.tipo === 'SINTETICO' ? (
                              <>
                                <div className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1.5">
                                  <Folder size={12} className="text-indigo-500" />
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Sintético</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="px-2 py-0.5 rounded-md bg-slate-500/10 border border-slate-500/20 flex items-center gap-1.5">
                                  <FileText size={12} className="text-slate-500" />
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Analítico</span>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-block w-2 h-2 rounded-full ${cc.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenModal(cc)}
                              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => toggleStatus(cc)}
                              className={`p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all ${cc.is_active ? 'text-slate-500 hover:text-amber-500' : 'text-amber-500 hover:text-emerald-500'}`}
                              title={cc.is_active ? "Inativar" : "Ativar"}
                            >
                              <Power size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(cc.id)}
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
                    <td colSpan="4" className="py-12 text-center text-slate-400 italic">Nenhum centro de custo encontrado.</td>
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
                    {editingCC ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
                  </h3>
                  <p className="text-xs text-slate-500">Estruture suas dimensões de custo e receita.</p>
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

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tipo de Centro</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, tipo: 'SINTETICO'})}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.tipo === 'SINTETICO' ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500'}`}
                      >
                        <Folder size={14} /> Sintético
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, tipo: 'ANALITICO'})}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.tipo === 'ANALITICO' ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500'}`}
                      >
                        <FileText size={14} /> Analítico
                      </button>
                    </div>
                    {formData.tipo === 'SINTETICO' && (
                      <p className="mt-1 text-[10px] text-amber-500 font-medium italic">* Centros sintéticos servem apenas como agrupadores e não aceitam lançamentos diretos.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Centro Pai (Opcional)</label>
                    <select 
                      value={formData.parent_id}
                      onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                      disabled={!!editingCC}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary disabled:opacity-50"
                    >
                      <option value="">Nenhum (Nível Raiz)</option>
                      {centros.filter(c => c.tipo === 'SINTETICO' && c.id !== editingCC?.id).map(c => (
                        <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Código</label>
                      <input 
                        type="text" required
                        placeholder="Ex: 100"
                        value={formData.codigo}
                        onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Descrição</label>
                      <input 
                        type="text" required
                        placeholder="Ex: Marketing Digital"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <label htmlFor="is_active" className="text-sm text-slate-600 dark:text-slate-400 font-medium">Centro Ativo</label>
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
