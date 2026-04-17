import { api } from './api';

export const ContabilidadeAPI = {
  // Templates
  getTemplates: async (atividade) => {
    const params = atividade ? { atividade_economica: atividade } : {};
    const { data } = await api.get('/contabilidade/templates', { params });
    return data;
  },
  getTemplate: async (modeloId) => {
    const { data } = await api.get(`/contabilidade/templates/${modeloId}`);
    return data;
  },

  // Ativar Módulo
  ativarModulo: async (payload) => {
    const { data } = await api.post('/contabilidade/ativar-modulo', payload);
    return data;
  },

  // Lotes
  getLotes: async (params = {}) => {
    const { data } = await api.get('/contabilidade/lotes', { params });
    return data;
  },
  getLote: async (loteId) => {
    const { data } = await api.get(`/contabilidade/lotes/${loteId}`);
    return data;
  },
  criarLancamento: async (payload) => {
    const { data } = await api.post('/contabilidade/lancamento', payload);
    return data;
  },

  // Livro Razão
  getRazao: async (contaId, dataInicio, dataFim) => {
    const params = { conta_id: contaId };
    if (dataInicio) params.data_inicio = dataInicio;
    if (dataFim) params.data_fim = dataFim;
    const { data } = await api.get('/contabilidade/razao', { params });
    return data;
  },

  // Balancete
  getBalancete: async (dataInicio, dataFim) => {
    const { data } = await api.get('/contabilidade/balancete', {
      params: { data_inicio: dataInicio, data_fim: dataFim }
    });
    return data;
  },

  // DRE
  getDRE: async (dataInicio, dataFim) => {
    const { data } = await api.get('/contabilidade/dre', {
      params: { data_inicio: dataInicio, data_fim: dataFim }
    });
    return data;
  },

  // Balanço
  getBalanco: async (dataBase) => {
    const { data } = await api.get('/contabilidade/balanco', {
      params: { data_base: dataBase }
    });
    return data;
  },
};
