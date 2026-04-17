/**
 * dashboardService.js
 *
 * Camada de serviço para busca de dados do dashboard via API (MODO LIVE).
 * Cada função mapeia um endpoint do backend FastAPI.
 * Usada apenas após autenticação — nunca exposta na landing pública.
 */

import { api } from '../lib/api';

export async function getFinancialSummary() {
  const { data } = await api.get('/dashboard/financial-summary');
  return data;
}

export async function getKPIs() {
  const { data } = await api.get('/dashboard/kpis');
  return data;
}

export async function getDRE(params = {}) {
  const { data } = await api.get('/dashboard/dre', { params });
  return data;
}

export async function getCashFlow(params = {}) {
  const { data } = await api.get('/dashboard/cashflow', { params });
  return data;
}

export async function getCostDistribution(params = {}) {
  const { data } = await api.get('/dashboard/cost-distribution', { params });
  return data;
}

export async function getMultiEmpresa() {
  const { data } = await api.get('/dashboard/multi-empresa');
  return data;
}
