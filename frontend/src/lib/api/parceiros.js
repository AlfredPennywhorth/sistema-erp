import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/parceiros';

const getAuthHeaders = () => {
  const userStr = localStorage.getItem('erp_user');
  const tenantId = localStorage.getItem('erp_active_tenant');
  
  if (!userStr || !tenantId) return {};
  
  const user = JSON.parse(userStr);
  return {
    'X-User-ID': user.id,
    'X-Tenant-ID': tenantId,
  };
};

export const ParceirosAPI = {
  list: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.is_cliente !== undefined) params.append('is_cliente', filters.is_cliente);
    if (filters.is_fornecedor !== undefined) params.append('is_fornecedor', filters.is_fornecedor);

    const response = await axios.get(`${API_URL}/?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  create: async (data) => {
    const response = await axios.post(API_URL, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  update: async (id, data) => {
    const response = await axios.patch(`${API_URL}/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getCNPJInfo: async (cnpj) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    const response = await axios.get(`${API_URL}/cnpj/${cleanCNPJ}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};
