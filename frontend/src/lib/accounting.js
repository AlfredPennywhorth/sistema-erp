import { api } from './api';

const accountingApi = {
  getRules: (includeInactive = false) => 
    api.get(`/accounting/rules?include_inactive=${includeInactive}`),
  
  getRule: (id) => 
    api.get(`/accounting/rules/${id}`),
    
  createRule: (data) => 
    api.post('/accounting/rules', data),
    
  updateRule: (id, data) => 
    api.patch(`/accounting/rules/${id}`, data),
    
  deleteRule: (id) => 
    api.delete(`/accounting/rules/${id}`)
};

export default accountingApi;
