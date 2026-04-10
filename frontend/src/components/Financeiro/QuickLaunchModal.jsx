import React, { useState, useEffect } from 'react';
import { X, Zap, DollarSign, Calendar, Tag, User, Layers, Building2, Plus, Loader2, Check, Search, Phone, Mail } from 'lucide-react';
import { api } from '../../lib/api';

const NovoParceirInline = ({ onSalvo, onCancelar }) => {
  const [loading, setLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [dados, setDados] = useState({
    nome_razao: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    tipo_pessoa: 'PJ',
    is_cliente: true,
    is_fornecedor: false,
    telefone: '',
    email: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
  });

  const maskCNPJ = (v) => {
    v = v.replace(/\D/g, '');
    if (v.length > 14) v = v.substring(0, 14);
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    return v;
  };

  const maskCPF = (v) => {
    v = v.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  };

  const handleCnpjChange = async (val) => {
    const masked = maskCNPJ(val);
    setDados(prev => ({ ...prev, cpf_cnpj: masked }));

    const clean = masked.replace(/\D/g, '');
    if (clean.length === 14) {
      setCnpjLoading(true);
      try {
        const res = await api.get(`/parceiros/cnpj/${clean}`);
        const info = res.data;
        setDados(prev => ({
          ...prev,
          cpf_cnpj: masked,
          nome_razao: info.razao_social || info.nome || prev.nome_razao,
          nome_fantasia: info.nome_fantasia || prev.nome_fantasia,
          logradouro: info.logradouro || prev.logradouro,
          numero: info.numero || prev.numero,
          bairro: info.bairro || prev.bairro,
          cidade: info.municipio || prev.cidade,
          uf: info.uf || prev.uf,
          cep: (info.cep || prev.cep).replace(/\D/g, ''),
        }));
      } catch (err) {
        console.warn('CNPJ não encontrado na BrasilAPI:', err.message);
      } finally {
        setCnpjLoading(false);
      }
    }
  };

  const handleSalvar = async () => {
    if (!dados.nome_razao.trim() || !dados.cpf_cnpj.trim()) {
      alert('Preencha o nome e o CPF/CNPJ.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/parceiros/', { ...dados, cpf_cnpj: dados.cpf_cnpj.replace(/\D/g, '') });
      onSalvo(res.data);
    } catch (err) {
      alert('Erro ao criar parceiro: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-300">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cadastro Rápido de Parceiro</p>

      {/* Tipo PJ/PF */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setDados(prev => ({ ...prev, tipo_pessoa: 'PJ' }))}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            dados.tipo_pessoa === 'PJ' ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'
          }`}>
          Pessoa Jurídica
        </button>
        <button type="button" onClick={() => setDados(prev => ({ ...prev, tipo_pessoa: 'PF' }))}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            dados.tipo_pessoa === 'PF' ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'
          }`}>
          Pessoa Física
        </button>
      </div>

      {/* CNPJ/CPF com busca automática */}
      <div className="relative">
        <input
          placeholder={dados.tipo_pessoa === 'PJ' ? 'CNPJ (busca automática) *' : 'CPF *'}
          className="w-full h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 pr-10 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
          value={dados.cpf_cnpj}
          onChange={(e) => {
            if (dados.tipo_pessoa === 'PJ') {
              handleCnpjChange(e.target.value);
            } else {
              setDados(prev => ({ ...prev, cpf_cnpj: maskCPF(e.target.value) }));
            }
          }}
        />
        <div className="absolute right-3 top-2.5 text-slate-400">
          {cnpjLoading ? <Loader2 size={16} className="animate-spin text-brand-primary" /> : <Search size={16} />}
        </div>
      </div>

      {/* Razão Social - preenchida automaticamente */}
      <input
        placeholder={dados.tipo_pessoa === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}
        className="w-full h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
        value={dados.nome_razao}
        onChange={(e) => setDados(prev => ({ ...prev, nome_razao: e.target.value }))}
      />

      {/* Telefone e Email - preenchimento manual */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Phone size={13} className="absolute left-3 top-3 text-slate-400" />
          <input
            placeholder="Telefone"
            className="w-full h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
            value={dados.telefone}
            onChange={(e) => setDados(prev => ({ ...prev, telefone: e.target.value }))}
          />
        </div>
        <div className="relative">
          <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
          <input
            placeholder="E-mail"
            type="email"
            className="w-full h-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary"
            value={dados.email}
            onChange={(e) => setDados(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
      </div>

      {/* Endereço preenchido automaticamente (somente leitura visual) */}
      {dados.logradouro && (
        <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          ✅ Endereço preenchido: {dados.logradouro}, {dados.numero} - {dados.bairro}, {dados.cidade}/{dados.uf}
        </div>
      )}

      {/* Cliente / Fornecedor */}
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={dados.is_cliente} onChange={(e) => setDados(prev => ({ ...prev, is_cliente: e.target.checked }))} />
          Cliente
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={dados.is_fornecedor} onChange={(e) => setDados(prev => ({ ...prev, is_fornecedor: e.target.checked }))} />
          Fornecedor
        </label>
      </div>

      {/* Botões */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancelar}
          className="px-4 h-9 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
          Cancelar
        </button>
        <button type="button" onClick={handleSalvar} disabled={loading || cnpjLoading}
          className="flex-1 h-9 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Salvar Parceiro
        </button>
      </div>
    </div>
  );
};

const QuickLaunchModal = ({ isOpen, onClose, onSuccess, initialNatureza = 'PAGAR' }) => {
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [showNovoParceiro, setShowNovoParceiro] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    valor_previsto: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    natureza: initialNatureza,
    tipo: 'PROVISAO',
    plano_contas_id: '',
    parceiro_id: '',
    centro_custo: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        natureza: initialNatureza,
        descricao: '',
        valor_previsto: '',
        data_vencimento: new Date().toISOString().split('T')[0],
      }));
      setShowNovoParceiro(false);
      fetchData();
    }
  }, [isOpen, initialNatureza]);

  const fetchData = async () => {
    try {
      const [planosRes, parceirosRes] = await Promise.all([
        api.get('/financeiro/plano-contas'),
        api.get('/parceiros/')
      ]);
      setPlanos(planosRes.data);
      setParceiros(parceirosRes.data);
      if (planosRes.data.length > 0) {
        setFormData(prev => ({ ...prev, plano_contas_id: planosRes.data[0].id }));
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const handleNovoParceirSalvo = (novoParceiro) => {
    setParceiros(prev => [...prev, novoParceiro]);
    setFormData(prev => ({ ...prev, parceiro_id: novoParceiro.id }));
    setShowNovoParceiro(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/financeiro/', {
        ...formData,
        valor_previsto: parseFloat(formData.valor_previsto),
        parceiro_id: formData.parceiro_id || null,
        centro_custo: formData.centro_custo || null,
      });
      if (onSuccess) onSuccess();
      window.dispatchEvent(new CustomEvent('financeiro-updated'));
      onClose();
      setFormData({
        descricao: '',
        valor_previsto: '',
        data_vencimento: new Date().toISOString().split('T')[0],
        natureza: initialNatureza,
        tipo: 'PROVISAO',
        plano_contas_id: planos[0]?.id || '',
        parceiro_id: '',
        centro_custo: '',
      });
    } catch (err) {
      alert('Erro ao criar lançamento: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-brand-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Lançamento Rápido</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Pressione ESC para sair</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-2 gap-6">
            {/* Natureza */}
            <div className="col-span-2 flex gap-4 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl">
              <button
                type="button"
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  formData.natureza === 'PAGAR'
                    ? 'bg-white dark:bg-slate-800 text-red-500 shadow-sm'
                    : 'text-slate-500'
                }`}
                onClick={() => setFormData({ ...formData, natureza: 'PAGAR' })}
              >
                Contas a Pagar
              </button>
              <button
                type="button"
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  formData.natureza === 'RECEBER'
                    ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm'
                    : 'text-slate-500'
                }`}
                onClick={() => setFormData({ ...formData, natureza: 'RECEBER' })}
              >
                Contas a Receber
              </button>
            </div>

            {/* Descrição */}
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Tag size={12} />
                Descrição do Lançamento
              </label>
              <input
                autoFocus
                required
                placeholder="Ex: Aluguel Mensal, Pagamento Fornecedor X..."
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={12} />
                Valor Previsto
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.valor_previsto}
                onChange={(e) => setFormData({ ...formData, valor_previsto: e.target.value })}
              />
            </div>

            {/* Vencimento */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} />
                Data de Vencimento
              </label>
              <input
                type="date"
                required
                className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
              />
            </div>

            {/* Plano de Contas */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={12} />
                Classificação (Plano)
              </label>
              <select
                required
                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.plano_contas_id}
                onChange={(e) => setFormData({ ...formData, plano_contas_id: e.target.value })}
              >
                {planos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {p.codigo_estruturado || p.codigo} - {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Parceiro */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={12} />
                Parceiro (Opcional)
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  value={formData.parceiro_id}
                  onChange={(e) => setFormData({ ...formData, parceiro_id: e.target.value })}
                >
                  <option value="" className="bg-white dark:bg-slate-800">Nenhum parceiro vinculado</option>
                  {parceiros.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {p.nome_razao}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="Cadastrar novo parceiro"
                  onClick={() => setShowNovoParceiro(!showNovoParceiro)}
                  className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all ${
                    showNovoParceiro
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-brand-primary hover:border-brand-primary'
                  }`}
                >
                  <Plus size={18} />
                </button>
              </div>

              {showNovoParceiro && (
                <NovoParceirInline
                  onSalvo={handleNovoParceirSalvo}
                  onCancelar={() => setShowNovoParceiro(false)}
                />
              )}
            </div>

            {/* Centro de Custo */}
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} />
                Centro de Custo (Opcional)
              </label>
              <select
                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                value={formData.centro_custo}
                onChange={(e) => setFormData({ ...formData, centro_custo: e.target.value })}
              >
                <option value="" className="bg-white dark:bg-slate-800">Sem Centro de Custo</option>
                <option value="ADMINISTRATIVO" className="bg-white dark:bg-slate-800">Administrativo</option>
                <option value="COMERCIAL" className="bg-white dark:bg-slate-800">Comercial</option>
                <option value="FINANCEIRO" className="bg-white dark:bg-slate-800">Financeiro</option>
                <option value="OPERACIONAL" className="bg-white dark:bg-slate-800">Operacional</option>
                <option value="RH" className="bg-white dark:bg-slate-800">Recursos Humanos</option>
                <option value="TI" className="bg-white dark:bg-slate-800">Tecnologia da Informação</option>
                <option value="MARKETING" className="bg-white dark:bg-slate-800">Marketing</option>
              </select>
            </div>
          </div>

          <div className="mt-10 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-14 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-14 bg-brand-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} />
              {loading ? 'Gravando...' : 'Finalizar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickLaunchModal;
