import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Plus, Filter, 
  MoreHorizontal, Pencil, Trash2, 
  CheckCircle2, XCircle, Building2, 
  User as UserIcon, Loader2, RefreshCw,
  Mail, Phone, ExternalLink
} from 'lucide-react';
import { ParceirosAPI } from '../../lib/api/parceiros';
import ParceiroModal from './components/ParceiroModal';

export default function Parceiros() {
  const [parceiros, setParceiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos'); // todos, clientes, fornecedores
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState(null);

  useEffect(() => {
    fetchParceiros();
  }, []);

  const fetchParceiros = async () => {
    setLoading(true);
    try {
      const data = await ParceirosAPI.list();
      setParceiros(data);
    } catch (err) {
      console.error("Erro ao buscar parceiros:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredParceiros = useMemo(() => {
    return parceiros.filter(p => {
      const matchesSearch = 
        p.nome_razao?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.cpf_cnpj?.includes(searchTerm) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTab = 
        activeTab === 'todos' || 
        (activeTab === 'clientes' && p.is_cliente) || 
        (activeTab === 'fornecedores' && p.is_fornecedor);

      return matchesSearch && matchesTab;
    });
  }, [parceiros, searchTerm, activeTab]);

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente excluir este parceiro?")) {
      try {
        await ParceirosAPI.delete(id);
        fetchParceiros();
      } catch (err) {
        alert("Erro ao excluir parceiro.");
      }
    }
  };

  const tabs = [
    { id: 'todos', label: 'Todos', count: parceiros.length },
    { id: 'clientes', label: 'Clientes', count: parceiros.filter(p => p.is_cliente).length },
    { id: 'fornecedores', label: 'Fornecedores', count: parceiros.filter(p => p.is_fornecedor).length },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="text-blue-500" size={32} />
            Hub de Parceiros
          </h1>
          <p className="text-slate-400 mt-1">Gestão unificada de clientes e fornecedores com inteligência fiscal.</p>
        </div>
        
        <button 
          onClick={() => { setEditingParceiro(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-blue-900/20 transition-all active:scale-95 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Novo Registro
        </button>
      </div>

      {/* Hub Controls & Navigation */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between glass-morphism p-2 rounded-3xl border border-slate-700/30">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 w-full lg:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-xl' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                activeTab === tab.id ? 'bg-blue-400/30 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Nome, CNPJ ou Email..."
              className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl pl-11 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchParceiros}
            className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-morphism rounded-3xl border border-slate-700/30 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse"></div>
            </div>
            <p className="text-slate-400 font-medium italic">Sincronizando parceiros...</p>
          </div>
        ) : filteredParceiros.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800/40 text-slate-400 text-xs font-semibold uppercase tracking-wider text-left">
                  <th className="px-6 py-4">Parceiro</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Cidade/UF</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                <AnimatePresence>
                  {filteredParceiros.map((parceiro) => (
                    <motion.tr 
                      key={parceiro.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-white/5 transition-all text-sm"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${
                            parceiro.is_cliente ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {parceiro.cpf_cnpj?.length > 11 ? <Building2 size={18} /> : <UserIcon size={18} />}
                          </div>
                          <div>
                            <div className="text-white font-medium">{parceiro.nome_razao}</div>
                            <div className="text-slate-500 text-xs truncate max-w-[200px]">{parceiro.nome_fantasia || '---'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                        {parceiro.cpf_cnpj}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {parceiro.is_cliente && (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[10px] font-bold uppercase">Cliente</span>
                          )}
                          {parceiro.is_fornecedor && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase">Fornecedor</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {parceiro.email && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                              <Mail size={12} /> {parceiro.email}
                            </div>
                          )}
                          {parceiro.telefone && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                              <Phone size={12} /> {parceiro.telefone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{parceiro.cidade || '---'}</div>
                        <div className="text-slate-500 text-xs">{parceiro.uf || '--'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {parceiro.is_active ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg text-[10px] font-bold">
                              <CheckCircle2 size={12} /> ATIVO
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-500/10 px-2 py-1 rounded-lg text-[10px] font-bold">
                              <XCircle size={12} /> INATIVO
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingParceiro(parceiro); setIsModalOpen(true); }}
                            className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all" 
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(parceiro.id)}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all" 
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="p-6 bg-slate-800/30 rounded-full border border-slate-700/30">
              <Users size={64} className="text-slate-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white">Nenhum parceiro encontrado</h3>
              <p className="text-slate-500 mt-1 max-w-sm">Tente ajustar seus filtros ou comece cadastrando um novo parceiro agora mesmo.</p>
            </div>
          </div>
        )}
      </div>

      <ParceiroModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchParceiros}
        editingParceiro={editingParceiro}
      />
    </div>
  );
}
