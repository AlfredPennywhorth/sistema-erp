import { api } from './api';

let bancosCache = null;

export const FinanceiroAPI = {
  // Bancos (Globais/Leitura)
  getBancos: async () => {
    if (bancosCache) return bancosCache;
    const { data } = await api.get('/financeiro/bancos');
    bancosCache = data;
    return data;
  },
  createBanco: async (bancoData) => {
    const { data } = await api.post('/financeiro/bancos', bancoData);
    if (bancosCache) bancosCache.push(data);
    return data;
  },

  // Contas Bancárias
  getContasBancarias: async () => {
    const { data } = await api.get('/financeiro/contas-bancarias');
    return data;
  },
  createContaBancaria: async (contaData) => {
    const { data } = await api.post('/financeiro/contas-bancarias', contaData);
    return data;
  },
  updateContaBancaria: async (id, contaData) => {
    const { data } = await api.put(`/financeiro/contas-bancarias/${id}`, contaData);
    return data;
  },
  deleteContaBancaria: async (id) => {
    const { data } = await api.delete(`/financeiro/contas-bancarias/${id}`);
    return data;
  },

  // Plano de Contas
  getPlanoContas: async () => {
    const { data } = await api.get('/financeiro/plano-contas');
    return data;
  },
  createPlanoConta: async (planoData) => {
    const { data } = await api.post('/financeiro/plano-contas', planoData);
    return data;
  },
  updatePlanoConta: async (id, planoData) => {
    const { data } = await api.put(`/financeiro/plano-contas/${id}`, planoData);
    return data;
  },
  deletePlanoConta: async (id) => {
    const { data } = await api.delete(`/financeiro/plano-contas/${id}`);
    return data;
  },

  // Centros de Custo
  getCentrosCusto: async () => {
    const { data } = await api.get('/financeiro/centros-custo');
    return data;
  },
  createCentroCusto: async (ccData) => {
    const { data } = await api.post('/financeiro/centros-custo', ccData);
    return data;
  },
  updateCentroCusto: async (id, ccData) => {
    const { data } = await api.put(`/financeiro/centros-custo/${id}`, ccData);
    return data;
  },
  deleteCentroCusto: async (id) => {
    const { data } = await api.delete(`/financeiro/centros-custo/${id}`);
    return data;
  },

  // Formas de Pagamento
  getFormasPagamento: async () => {
    const { data } = await api.get('/financeiro/formas-pagamento');
    return data;
  },
  createFormaPagamento: async (formaData) => {
    const { data } = await api.post('/financeiro/formas-pagamento', formaData);
    return data;
  },
  updateFormaPagamento: async (id, formaData) => {
    const { data } = await api.put(`/financeiro/formas-pagamento/${id}`, formaData);
    return data;
  },
  deleteFormaPagamento: async (id) => {
    const { data } = await api.delete(`/financeiro/formas-pagamento/${id}`);
    return data;
  },

  // Bandeiras de Cartão
  getBandeirasCartao: async (formasPagamentoId) => {
    const params = formasPagamentoId ? { forma_pagamento_id: formasPagamentoId } : {};
    const { data } = await api.get('/financeiro/bandeiras-cartao', { params });
    return data;
  },
  createBandeiraCartao: async (bandeiraData) => {
    const { data } = await api.post('/financeiro/bandeiras-cartao', bandeiraData);
    return data;
  },
  updateBandeiraCartao: async (id, bandeiraData) => {
    const { data } = await api.put(`/financeiro/bandeiras-cartao/${id}`, bandeiraData);
    return data;
  },
  deleteBandeiraCartao: async (id) => {
    const { data } = await api.delete(`/financeiro/bandeiras-cartao/${id}`);
    return data;
  },
  getFaturasCartao: async (params = {}) => {
    const { data } = await api.get('/financeiro/faturas-cartao', { params });
    return data;
  },
  getFaturaCartao: async (id) => {
    const { data } = await api.get(`/financeiro/faturas-cartao/${id}`);
    return data;
  },
  getLancamentosFatura: async (faturaId) => {
    const { data } = await api.get(`/financeiro/faturas-cartao/${faturaId}/lancamentos`);
    return data;
  },
  createFaturaCartao: async (faturaData) => {
    const { data } = await api.post('/financeiro/faturas-cartao', faturaData);
    return data;
  },
  pagarFaturaCartao: async (faturaId, payload) => {
    const { data } = await api.post(`/financeiro/faturas-cartao/${faturaId}/pagar`, payload);
    return data;
  },
};
