import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Landmark, Plus, Search, Building2, CreditCard, Building, Layers } from 'lucide-react';
import { FinanceiroAPI } from '../../lib/financeiro';
import PlanoContas from './PlanoContas';
import CentrosCusto from './CentrosCusto';

function ContasBancarias() {
  const [contas, setContas] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, banco_id: '', nome: '', agencia: '', conta: '', saldo_inicial: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingBanco, setIsAddingBanco] = useState(false);
  const [newBanco, setNewBanco] = useState({ codigo_bacen: '', nome: '' });

  useEffect(() => {
    fetchDados();
  }, []);

  async function fetchDados() {
    setLoading(true);
    try {
      const [contasData, bancosData] = await Promise.all([
        FinanceiroAPI.getContasBancarias(),
        FinanceiroAPI.getBancos()
      ]);
      setContas(contasData);
      setBancos(bancosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (conta = null) => {
    if (conta) {
      setFormData({ 
        id: conta.id, 
        banco_id: conta.banco_id, 
        nome: conta.nome, 
        agencia: conta.agencia, 
        conta: conta.conta, 
        saldo_inicial: conta.saldo_inicial 
      });
      setIsEditing(true);
    } else {
      setFormData({ id: null, banco_id: bancos.length > 0 ? bancos[0].id : '', nome: '', agencia: '', conta: '', saldo_inicial: 0 });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ id: null, banco_id: '', nome: '', agencia: '', conta: '', saldo_inicial: 0 });
    setIsAddingBanco(false);
    setNewBanco({ codigo_bacen: '', nome: '' });
  };

  const handleCreateBanco = async () => {
    if (!newBanco.codigo_bacen || !newBanco.nome) {
      alert("Preencha o código do banco e o nome.");
      return null;
    }
    try {
      const createdBanco = await FinanceiroAPI.createBanco(newBanco);
      setBancos([...bancos, createdBanco]);
      return createdBanco.id;
    } catch (error) {
      console.error("Erro ao criar banco:", error);
      alert("Erro ao cadastrar banco. Verifique se o código já existe.");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalBancoId = formData.banco_id;

      if (isAddingBanco) {
        finalBancoId = await handleCreateBanco();
        if (!finalBancoId) return; // cancela submit se falhar
      }

      const payload = {
        banco_id: finalBancoId,
        nome: formData.nome,
        agencia: formData.agencia,
        conta: formData.conta,
        saldo_inicial: parseFloat(formData.saldo_inicial) || 0
      };

      if (isEditing) {
        await FinanceiroAPI.updateContaBancaria(formData.id, payload);
      } else {
        await FinanceiroAPI.createContaBancaria(payload);
      }
      await fetchDados();
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      alert("Erro ao salvar a conta bancária.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        await FinanceiroAPI.deleteContaBancaria(id);
        await fetchDados();
      } catch (error) {
        console.error("Erro ao excluir conta:", error);
        alert("Erro ao excluir a conta bancária.");
      }
    }
  };

  const getBancoName = (id) => {
    const banco = bancos.find(b => b.id === id);
    return banco ? banco.nome : 'Desconhecido';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-primary" />
            Contas Bancárias
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie as contas bancárias da empresa</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-brand-primary/25"
        >
          <Plus size={16} />
          Nova Conta
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {isEditing ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Banco</label>
                  {!isEditing && (
                    <button 
                      type="button" 
                      onClick={() => setIsAddingBanco(!isAddingBanco)}
                      className="text-xs text-brand-primary font-bold hover:underline"
                    >
                      {isAddingBanco ? "Selecionar Existente" : "+ Cadastrar Novo"}
                    </button>
                  )}
                </div>
                
                {isAddingBanco ? (
                  <div className="flex gap-2 bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/20">
                    <input 
                      type="text" required
                      placeholder="Cod. (Ex: 341)"
                      value={newBanco.codigo_bacen}
                      onChange={e => setNewBanco({...newBanco, codigo_bacen: e.target.value})}
                      className="w-1/3 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800 dark:text-white outline-none text-sm"
                    />
                    <input 
                      type="text" required
                      placeholder="Nome da Instituição"
                      value={newBanco.nome}
                      onChange={e => setNewBanco({...newBanco, nome: e.target.value})}
                      className="w-2/3 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800 dark:text-white outline-none text-sm"
                    />
                  </div>
                ) : (
                  <select 
                    required
                    value={formData.banco_id}
                    onChange={e => setFormData({...formData, banco_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800 dark:text-white outline-none transition-all"
                  >
                    <option value="" disabled>Selecione um banco</option>
                    {bancos.map(b => (
                      <option key={b.id} value={b.id}>{b.codigo_bacen} - {b.nome}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome de Identificação (Ex: Conta Principal)</label>
                <input 
                  type="text" required
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800 dark:text-white outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Agência</label>
                  <input 
                    type="text" required
                    value={formData.agencia}
                    onChange={e => setFormData({...formData, agencia: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800 dark:text-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Conta</label>
                  <input 
                    type="text" required
                    value={formData.conta}
                    onChange={e => setFormData({...formData, conta: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800 dark:text-white outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Saldo Inicial (R$)</label>
                <input 
                  type="number" step="0.01" required
                  value={formData.saldo_inicial}
                  onChange={e => setFormData({...formData, saldo_inicial: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800 dark:text-white outline-none transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-sm font-bold transition-all shadow-sm">
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
              <th className="p-4 border-b border-slate-200 dark:border-white/5">Banco</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5">Nome da Conta</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5">Agência</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5">Conta</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5 text-right">Saldo Inicial</th>
              <th className="p-4 border-b border-slate-200 dark:border-white/5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-sm">
            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-24"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-40"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-16"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-20"></div></td>
                    <td className="p-4 flex justify-end"><div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-24"></div></td>
                    <td className="p-4 text-right"><div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))}
              </>
            ) : contas.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p>Nenhuma conta cadastrada.</p>
                  </div>
                </td>
              </tr>
            ) : (
              contas.map((conta) => (
                <tr key={conta.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors group">
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-medium text-xs">{getBancoName(conta.banco_id)}</td>
                  <td className="p-4 font-semibold text-slate-800 dark:text-white">{conta.nome}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{conta.agencia}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-mono">{conta.conta}</td>
                  <td className="p-4 text-right font-bold text-slate-800 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.saldo_inicial)}
                  </td>
                  <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(conta)} className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors text-xs uppercase font-bold mr-2 tracking-wider">Editar</button>
                    <button onClick={() => handleDelete(conta.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors text-xs uppercase font-bold tracking-wider">Excluir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState('contas');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Premium do Módulo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-brand-primary/10 rounded-2xl">
            <Landmark className="w-8 h-8 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Financeiro</h1>
            <p className="text-slate-500 dark:text-slate-400">Gestão de contas, limites e recebíveis.</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-white/10 pb-px">
        <button
          onClick={() => setActiveTab('contas')}
          className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
            activeTab === 'contas' 
              ? 'text-brand-primary' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} />
            Contas Bancárias
          </div>
          {activeTab === 'contas' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
        {/* 
        <button
          onClick={() => setActiveTab('plano')}
          className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
            activeTab === 'plano' 
              ? 'text-brand-primary' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <CreditCard size={16} />
            Plano de Contas
          </div>
          {activeTab === 'plano' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('centros')}
          className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
            activeTab === 'centros' 
              ? 'text-brand-primary' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers size={16} />
            Centros de Custo
          </div>
          {activeTab === 'centros' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
        */}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {activeTab === 'contas' && <ContasBancarias />}
        {/* {activeTab === 'plano' && <PlanoContas />} */}
        {/* {activeTab === 'centros' && <CentrosCusto />} */}
      </motion.div>
    </div>
  );
}
