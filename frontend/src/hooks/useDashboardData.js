/**
 * useDashboardData.js
 *
 * Hook central para dados do dashboard.
 *
 * mode = 'demo'  → retorna landingDashboardMock (sem acesso ao banco)
 * mode = 'live'  → busca dados reais via API (exige autenticação)
 */

import { useState, useEffect } from 'react';
import { landingDashboardMock } from '../mocks/landingDashboardMock';
import * as dashboardService from '../services/dashboardService';

export function useDashboardData({ mode = 'demo' } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (mode === 'demo') {
          // Simula latência mínima para feedback de skeleton
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (!cancelled) setData(landingDashboardMock);
        } else {
          // Busca todas as seções em paralelo
          const [financialSummary, kpis, dre, cashflow, costDistribution, multiEmpresa] =
            await Promise.all([
              dashboardService.getFinancialSummary(),
              dashboardService.getKPIs(),
              dashboardService.getDRE(),
              dashboardService.getCashFlow(),
              dashboardService.getCostDistribution(),
              dashboardService.getMultiEmpresa(),
            ]);

          if (!cancelled) {
            setData({ financialSummary, kpis, dre, cashflow, costDistribution, multiEmpresa });
          }
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erro ao carregar dados.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  return { data, loading, error };
}
