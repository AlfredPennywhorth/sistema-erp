import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Loader2, Search, Building2, User,
  MapPin, Phone, Mail, FileText, 
  CreditCard, Info, AlertCircle, Plus, Check,
  Trash2, UserPlus, Star
} from 'lucide-react';
import { ParceirosAPI } from '../../../lib/api/parceiros';
import { FinanceiroAPI } from '../../../lib/financeiro';

export default function ParceiroModal({ isOpen, onClose, onSave, editingParceiro = null }) {
  const [activeTab, setActiveTab] = useState('basicos');
  const [loading, setLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contasContabeis, setContasContabeis] = useState([]);

  // Funções de Máscara nativas para evitar crashes do react-input-mask
  const maskCPF = (v) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const maskCNPJ = (v) => {
    v = v.replace(/\D/g, "");
    if (v.length > 14) v = v.substring(0, 14);
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
    return v;
  };

  const maskCEP = (v) => {
    v = v.replace(/\D/g, "");
    if (v.length > 8) v = v.substring(0, 8);
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    return v;
  };

  const maskPhone = (v) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    if (v.length > 9) {
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
    } else {
      v = v.replace(/(\d{4})(\d)/, "$1-$2");
    }
    return v;
  };

  const [formData, setFormData] = useState({
    tipo_pessoa: 'PJ',
    nome_razao: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    is_cliente: true,
    is_fornecedor: false,
    inscricao_estadual: '',
    inscricao_municipal: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    conta_padrao_id: '',
    observacoes: '',
    is_active: true,
    contatos: []
  });

  useEffect(() => {
    if (editingParceiro) {
      setFormData({
        ...editingParceiro,
        tipo_pessoa: editingParceiro.tipo_pessoa || 'PJ',
        conta_padrao_id: editingParceiro.conta_padrao_id || '',
        contatos: editingParceiro.contatos || []
      });
    } else {
      setFormData({
        tipo_pessoa: 'PJ',
        nome_razao: '',
        nome_fantasia: '',
        cpf_cnpj: '',
        is_cliente: true,
        is_fornecedor: false,
        inscricao_estadual: '',
        inscricao_municipal: '',
        email: '',
        telefone: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        conta_padrao_id: '',
        observacoes: '',
        is_active: true,
        contatos: []
      });
    }
    fetchContas();
    setActiveTab('basicos');
    setError(null);
  }, [editingParceiro, isOpen]);

  async function fetchContas() {
    try {
      const data = await FinanceiroAPI.getPlanoContas();
      if (Array.isArray(data)) {
        setContasContabeis(data.filter(c => c.is_analitica));
      } else {
        setContasContabeis([]);
      }
    } catch (err) {
      console.error("Erro ao buscar plano de contas:", err);
      setContasContabeis([]);
    }
  }

  const handleCnpjBlur = async () => {
    if (formData.tipo_pessoa !== 'PJ') return;
    
    const cleanCnpj = formData.cpf_cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setCnpjLoading(true);
    setError(null);
    try {
      const info = await ParceirosAPI.getCNPJInfo(cleanCnpj);
      setFormData(prev => ({
        ...prev,
        nome_razao: info.razao_social || info.nome || prev.nome_razao,
        nome_fantasia: info.nome_fantasia || prev.nome_fantasia,
        logradouro: info.logradouro || prev.logradouro,
        numero: info.numero || prev.numero,
        complemento: info.complemento || prev.complemento,
        bairro: info.bairro || prev.bairro,
        cep: info.cep || prev.cep,
        cidade: info.municipio || prev.cidade,
        uf: info.uf || prev.uf
      }));
    } catch (err) {
      console.error("Erro na consulta de CNPJ:", err);
      const msg = err.response?.data?.detail || "Não foi possível auto-preencher os dados via CNPJ.";
      setError(msg);
    } finally {
      setCnpjLoading(false);
    }
  };

  const addContato = () => {
    setFormData(prev => ({
      ...prev,
      contatos: [...prev.contatos, { nome: '', email: '', telefone: '', cargo: '', is_principal: prev.contatos.length === 0 }]
    }));
  };

  const removeContato = (index) => {
    setFormData(prev => ({
      ...prev,
      contatos: prev.contatos.filter((_, i) => i !== index)
    }));
  };

  const updateContato = (index, field, value) => {
    setFormData(prev => {
      const newContatos = [...prev.contatos];
      if (field === 'is_principal' && value === true) {
        newContatos.forEach(c => c.is_principal = false);
      }
      newContatos[index] = { ...newContatos[index], [field]: value };
      return { ...prev, contatos: newContatos };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const cleanDoc = formData.cpf_cnpj.replace(/\D/g, '');
    if (formData.tipo_pessoa === 'PF' && cleanDoc.length !== 11) {
      setError("CPF deve ter 11 dígitos.");
      return;
    }
    if (formData.tipo_pessoa === 'PJ' && cleanDoc.length !== 14) {
      setError("CNPJ deve ter 14 dígitos.");
      return;
    }

    // Validação de contatos
    const invalidContato = formData.contatos.find(c => !c.nome.trim());
    if (invalidContato) {
      setError("Todos os contatos devem ter um nome.");
      setActiveTab('contatos');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = { 
        ...formData,
        conta_padrao_id: formData.conta_padrao_id || null
      };
      
      if (editingParceiro) {
        await ParceirosAPI.update(editingParceiro.id, payload);
      } else {
        await ParceirosAPI.create(payload);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao salvar parceiro.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basicos', label: 'Dados Básicos', icon: formData.tipo_pessoa === 'PJ' ? Building2 : User },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'contatos', label: 'Contatos', icon: UserPlus },
    { id: 'fiscal', label: 'Financeiro', icon: CreditCard },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-3xl overflow-hidden glass-morphism shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50 shrink-0">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            {editingParceiro ? <FileText className="text-blue-400" /> : <Plus className="text-emerald-400" />}
            {editingParceiro ? 'Editar Parceiro' : 'Novo Parceiro'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex bg-slate-800/30 p-1 mx-6 mt-4 rounded-xl border border-slate-700/30 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'basicos' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 w-full">
                  <button
                    type="button"
                    onClick={() => !editingParceiro && setFormData({...formData, tipo_pessoa: 'PJ'})}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      formData.tipo_pessoa === 'PJ' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                    } ${editingParceiro ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <Building2 size={16} />
                    Pessoa Jurídica
                  </button>
                  <button
                    type="button"
                    onClick={() => !editingParceiro && setFormData({...formData, tipo_pessoa: 'PF'})}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      formData.tipo_pessoa === 'PF' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                    } ${editingParceiro ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <User size={16} />
                    Pessoa Física
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      {formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.cpf_cnpj || ''}
                        onChange={e => {
                          const val = e.target.value;
                          const masked = formData.tipo_pessoa === 'PJ' ? maskCNPJ(val) : maskCPF(val);
                          setFormData({...formData, cpf_cnpj: masked});
                        }}
                        onBlur={handleCnpjBlur}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600"
                        placeholder={formData.tipo_pessoa === 'PJ' ? "00.000.000/0000-00" : "000.000.000-00"}
                        required
                      />
                      {cnpjLoading && <div className="absolute right-3 top-2.5"><Loader2 size={20} className="text-blue-400 animate-spin" /></div>}
                    </div>
                  </div>
                  <div className="flex items-end gap-6 h-full pb-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/40" checked={formData.is_cliente} onChange={e => setFormData({...formData, is_cliente: e.target.checked})} />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Cliente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500/40" checked={formData.is_fornecedor} onChange={e => setFormData({...formData, is_fornecedor: e.target.checked})} />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Fornecedor</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      {formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'}
                    </label>
                    <input type="text" required className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.nome_razao} onChange={e => setFormData({...formData, nome_razao: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      {formData.tipo_pessoa === 'PJ' ? 'Nome Fantasia' : 'Apelido'}
                    </label>
                    <input type="text" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.nome_fantasia || ''} onChange={e => setFormData({...formData, nome_fantasia: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'endereco' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email Principal</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                      <input type="email" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Telefone Comercial</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-slate-500" size={18} />
                      <input 
                        type="text"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" 
                        value={formData.telefone || ''} 
                        onChange={e => setFormData({...formData, telefone: maskPhone(e.target.value)})} 
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/50 pt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">CEP</label>
                      <input 
                        type="text"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" 
                        value={formData.cep || ''} 
                        onChange={e => setFormData({...formData, cep: maskCEP(e.target.value)})} 
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Logradouro</label>
                      <input type="text" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.logradouro || ''} onChange={e => setFormData({...formData, logradouro: e.target.value})} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Número</label>
                      <input type="text" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.numero || ''} onChange={e => setFormData({...formData, numero: e.target.value})} />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Bairro</label>
                      <input type="text" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.bairro || ''} onChange={e => setFormData({...formData, bairro: e.target.value})} />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Cidade</label>
                      <input type="text" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.cidade || ''} onChange={e => setFormData({...formData, cidade: e.target.value})} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">UF</label>
                      <input type="text" maxLength={2} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all uppercase" value={formData.uf || ''} onChange={e => setFormData({...formData, uf: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contatos' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-slate-400 text-balance">Gerencie múltiplos contatos para este parceiro.</p>
                  <button type="button" onClick={addContato} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-medium rounded-lg border border-slate-700 transition-all">
                    <Plus size={14} /> Adicionar Contato
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.contatos.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                      <UserPlus size={40} className="mb-3 opacity-20" />
                      <p>Nenhum contato cadastrado.</p>
                    </div>
                  ) : (
                    formData.contatos.map((contato, idx) => (
                      <div key={idx} className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-3 relative group">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="col-span-2 flex gap-2">
                            <input
                              placeholder="Nome do Contato"
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                              value={contato.nome}
                              onChange={e => updateContato(idx, 'nome', e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => updateContato(idx, 'is_principal', !contato.is_principal)}
                              title="Marcar como Principal"
                              className={`p-2 rounded-lg border transition-all ${contato.is_principal ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-slate-900 border-slate-700 text-slate-600 hover:text-slate-400'}`}
                            >
                              <Star size={16} fill={contato.is_principal ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeContato(idx)}
                              className="p-2 bg-slate-900 border border-slate-700 text-slate-600 hover:text-red-400 hover:border-red-400/50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div>
                            <input
                              placeholder="Cargo / Departamento"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                              value={contato.cargo || ''}
                              onChange={e => updateContato(idx, 'cargo', e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              placeholder="E-mail"
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                              value={contato.email || ''}
                              onChange={e => updateContato(idx, 'email', e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="Telefone"
                              className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                              value={contato.telefone || ''}
                              onChange={e => updateContato(idx, 'telefone', maskPhone(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'fiscal' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {formData.tipo_pessoa === 'PJ' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Insc. Estadual</label>
                      <input type="text" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.inscricao_estadual || ''} onChange={e => setFormData({...formData, inscricao_estadual: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Insc. Municipal</label>
                      <input type="text" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" value={formData.inscricao_municipal || ''} onChange={e => setFormData({...formData, inscricao_municipal: e.target.value})} />
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-blue-400 font-medium text-sm">
                    <CreditCard size={18} /> Configurações Financeiras
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Conta Contábil Padrão</label>
                    <select
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                      value={formData.conta_padrao_id || ''}
                      onChange={e => setFormData({...formData, conta_padrao_id: e.target.value})}
                    >
                      <option value="">Selecione uma conta analítica...</option>
                      {contasContabeis.map(conta => (
                        <option key={conta.id} value={conta.id}>{conta.codigo_estruturado} - {conta.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Observações Internas</label>
                    <textarea rows={3} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none" value={formData.observacoes || ''} onChange={e => setFormData({...formData, observacoes: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/50 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all">Cancelar</button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all active:scale-95"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {editingParceiro ? 'Salvar Alterações' : 'Criar Parceiro'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
