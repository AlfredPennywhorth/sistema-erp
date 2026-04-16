import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import accountingApi from '../../lib/accounting';
import { FinanceiroAPI } from '../../lib/financeiro';
import { Plus, Edit2, Trash2, X, AlertCircle, Save } from 'lucide-react';

const RegrasContabeis = () => {
  const { activeTenant, loading: authLoading } = useAuth();
  const [rules, setRules] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  
  const [formData, setFormData] = useState({
    tipo_evento: '',
    natureza: '',
    conta_debito_id: '',
    conta_credito_id: '',
    historico_padrao: '',
    ativo: true
  });

  const tiposEvento = [
    { value: 'COMPRA_PRAZO', label: 'Compra a Prazo' },
    { value: 'COMPRA_AVISTA', label: 'Compra à Vista' },
    { value: 'VENDA_PRAZO', label: 'Venda a Prazo' },
    { value: 'VENDA_AVISTA', label: 'Venda à Vista' },
    { value: 'SERVICO_PRESTADO_PRAZO', label: 'Serviço Prestado a Prazo' },
    { value: 'SERVICO_PRESTADO_AVISTA', label: 'Serviço Prestado à Vista' },
    { value: 'DESPESA_CONSUMO', label: 'Despesa de Consumo' },
    { value: 'ADIANTAMENTO_CLIENTE', label: 'Adiantamento de Cliente' },
    { value: 'ADIANTAMENTO_FORNECEDOR', label: 'Adiantamento a Fornecedor' },
    { value: 'TRANSFERENCIA_INTERNA', label: 'Transferência Interna' },
    { value: 'CONTRATACAO_EMPRESTIMO', label: 'Contratação de Empréstimo' },
    { value: 'PAGAMENTO_PARCELA_EMPRESTIMO', label: 'Pagamento de Parcela de Empréstimo' },
  ];

  const naturezas = [
    { value: 'PAGAR', label: 'Pagar' },
    { value: 'RECEBER', label: 'Receber' }
  ];

  useEffect(() => {
    if (activeTenant) {
      fetchData();
    }
  }, [activeTenant]);

  const fetchData = async () => {
    if (!activeTenant?.id) return;
    
    setError(null);
    setLoading(true);
    try {
      const [rulesRes, planoRes] = await Promise.all([
        accountingApi.getRules(true),
        FinanceiroAPI.getPlanoContas()
      ]);
      setRules(rulesRes.data);
      // Filtrar apenas contas analíticas e ativas para o formulário
      setPlanoContas(planoRes.filter(c => c.is_analitica && c.ativo));
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError('Falha ao carregar dados contábeis.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        tipo_evento: rule.tipo_evento,
        natureza: rule.natureza,
        conta_debito_id: rule.conta_debito_id,
        conta_credito_id: rule.conta_credito_id,
        historico_padrao: rule.historico_padrao || '',
        ativo: rule.ativo
      });
    } else {
      setEditingRule(null);
      setFormData({
        tipo_evento: '',
        natureza: '',
        conta_debito_id: '',
        conta_credito_id: '',
        historico_padrao: '',
        ativo: true
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await accountingApi.updateRule(editingRule.id, formData);
      } else {
        await accountingApi.createRule(formData);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao salvar regra.';
      alert(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente desativar esta regra?')) {
      try {
        await accountingApi.deleteRule(id);
        fetchData();
      } catch (err) {
        alert('Erro ao desativar regra.');
      }
    }
  };

  if (authLoading) return <div className="p-8">Carregando autenticação...</div>;
  if (!activeTenant) return (
    <div className="p-8 text-center">
      <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
      <h2 className="text-xl font-bold mb-2">Empresa não selecionada</h2>
      <p className="text-gray-600">Por favor, selecione uma empresa para gerenciar as regras contábeis.</p>
    </div>
  );

  if (loading && rules.length === 0) return <div className="p-8">Carregando dados contábeis...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Regras de Lançamento Automático</h1>
          <p className="text-gray-600">Configure como os eventos financeiros são traduzidos para a contabilidade.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} /> Nova Regra
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="text-red-400" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Natureza</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Débito</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crédito</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rules.map((rule) => (
              <tr key={rule.id} className={rule.ativo ? '' : 'bg-gray-50 opacity-60'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tiposEvento.find(t => t.value === rule.tipo_evento)?.label || rule.tipo_evento}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {rule.natureza}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {rule.nome_conta_debito}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {rule.nome_conta_credito}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rule.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {rule.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => handleOpenModal(rule)} className="text-blue-600 hover:text-blue-900"><Edit2 size={18} /></button>
                    {rule.ativo && (
                      <button onClick={() => handleDelete(rule.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-500 italic">Nenhuma regra configurada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Simples */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">{editingRule ? 'Editar Regra' : 'Nova Regra'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Tipo de Evento</label>
                <select 
                  required
                  value={formData.tipo_evento}
                  onChange={e => setFormData({...formData, tipo_evento: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Selecione...</option>
                  {tiposEvento.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Natureza</label>
                <select 
                  required
                  value={formData.natureza}
                  onChange={e => setFormData({...formData, natureza: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Selecione...</option>
                  {naturezas.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Conta de Débito</label>
                  <select 
                    required
                    value={formData.conta_debito_id}
                    onChange={e => setFormData({...formData, conta_debito_id: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">Selecione a conta...</option>
                    {planoContas.map(c => <option key={c.id} value={c.id}>{c.codigo_estruturado} - {c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Conta de Crédito</label>
                  <select 
                    required
                    value={formData.conta_credito_id}
                    onChange={e => setFormData({...formData, conta_credito_id: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">Selecione a conta...</option>
                    {planoContas.map(c => <option key={c.id} value={c.id}>{c.codigo_estruturado} - {c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Histórico Padrão</label>
                <input 
                  type="text"
                  value={formData.historico_padrao}
                  onChange={e => setFormData({...formData, historico_padrao: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Ex: Pagamento de NF {{nf_numero}}"
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={e => setFormData({...formData, ativo: e.target.checked})}
                />
                <label htmlFor="ativo" className="text-sm font-bold text-gray-900 cursor-pointer">Regra Ativa</label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700"
                >
                  <Save size={18} /> Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegrasContabeis;
