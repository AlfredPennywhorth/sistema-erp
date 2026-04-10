import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { supabase, api, setTenantId as setLocalTenantId, getTenantId as getLocalTenantId } from '../lib/api';

const AuthContext = createContext(undefined);

// Chaves de cache local — fonte de verdade instantânea
const CACHE_KEY_USER    = 'erp_cached_user';
const CACHE_KEY_TENANT  = 'erp_cached_tenant';
const CACHE_KEY_TENANTS = 'erp_cached_tenants';

const readCache = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const writeCache = (key, val) => { try { localStorage.setItem(key, val ? JSON.stringify(val) : ''); } catch {} };
const clearAllCache = () => [CACHE_KEY_USER, CACHE_KEY_TENANT, CACHE_KEY_TENANTS, 'erp_mock_user', 'erp_tenant_id'].forEach(k => localStorage.removeItem(k));

export const AuthProvider = ({ children }) => {
  // 🚀 Inicialização IMEDIATA a partir do cache — zero espera na primeira renderização
  const [user, setUser]               = useState(() => readCache(CACHE_KEY_USER));
  const [session, setSession]         = useState(null);
  const [activeTenant, setActiveTenant] = useState(() => readCache(CACHE_KEY_TENANT));
  const [userTenants, setUserTenants] = useState(() => readCache(CACHE_KEY_TENANTS) || []);
  // loading só é true quando NÃO temos cache de usuário (primeira vez ou logout)
  const [loading, setLoading]         = useState(() => !readCache(CACHE_KEY_USER));

  const isDebug = import.meta.env.VITE_DEBUG_MODE === 'true';
  const bgValidating = useRef(false); // evita múltiplas validações em background

  const log = (msg, data) => { if (isDebug) console.log(`[AUTH] ${msg}`, data ?? ''); };

  // ─── HIDRATAÇÃO ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Watchdog apertado: 4s (era 8s). Se travou algo, libera rápido.
    const watchdog = setTimeout(() => {
      if (loading) {
        console.warn('[WATCHDOG] Timeout. Liberando UI...');
        setLoading(false);
      }
    }, 4000);

    const initializeAuth = async () => {
      try {
        // PASSO 1 — Sessão Supabase (assíncrono, mas já temos cache exposto na UI)
        const { data: { session: sbSession } } = await supabase.auth.getSession();

        if (sbSession) {
          const currentUser = sbSession.user;
          setSession(sbSession);
          setUser(currentUser);
          writeCache(CACHE_KEY_USER, currentUser);

          // PASSO 2 — Tenant em background (não bloqueia a UI)
          const savedId = getLocalTenantId();
          if (savedId && !bgValidating.current) {
            bgValidating.current = true;
            validateTenantBackground(savedId, currentUser);
          }

        } else {
          // Tentar modo MOCK
          const mockUser = readCache('erp_mock_user');
          if (mockUser) {
            setUser(mockUser);
            setSession({ access_token: 'mock-token', user: mockUser });
            writeCache(CACHE_KEY_USER, mockUser);
            const savedId = getLocalTenantId();
            if (savedId && !bgValidating.current) {
              bgValidating.current = true;
              validateTenantBackground(savedId, mockUser);
            }
          } else {
            // Sem sessão: limpar cache de tenant mas manter loading=false rápido
            setUser(null);
            setActiveTenant(null);
            writeCache(CACHE_KEY_USER, null);
            writeCache(CACHE_KEY_TENANT, null);
          }
        }
      } catch (err) {
        console.error('[AUTH] Erro na hidratação:', err);
      } finally {
        setLoading(false); // ← libera a UI assim que a sessão for resolvida
        clearTimeout(watchdog);
      }
    };

    initializeAuth();
    return () => clearTimeout(watchdog);
  }, []);

  // ─── VALIDAÇÃO DE TENANT EM BACKGROUND (não bloqueia UI) ──────────────────
  const validateTenantBackground = async (tenantId) => {
    try {
      const res = await api.get('/tenants/me', {
        headers: { 'X-Tenant-ID': tenantId }
      });
      if (res?.data) {
        setActiveTenant(res.data);
        setLocalTenantId(tenantId);
        writeCache(CACHE_KEY_TENANT, res.data);
        log('Tenant validado em background:', res.data.razao_social);
      } else {
        invalidateTenant();
      }
    } catch (err) {
      log('Falha na validação background do tenant:', err?.response?.status);
      if ([401, 403, 404].includes(err?.response?.status)) {
        invalidateTenant();
      }
      // Outros erros (rede): mantém cache temporariamente — não puna o usuário por timeout
    } finally {
      bgValidating.current = false;
    }
  };

  const invalidateTenant = () => {
    setActiveTenant(null);
    setLocalTenantId(null);
    writeCache(CACHE_KEY_TENANT, null);
  };

  // ─── LISTENER SUPABASE (refresh de token, logout externo) ─────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      log(`Evento Supabase: ${event}`);
      setSession(session);
      setUser(session?.user ?? null);

      if (!session) {
        invalidateTenant();
        writeCache(CACHE_KEY_USER, null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        writeCache(CACHE_KEY_USER, session.user);
        const tid = getLocalTenantId();
        if (tid && !bgValidating.current) {
          bgValidating.current = true;
          validateTenantBackground(tid, session.user);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  async function login(email, password) {
    // Modo MOCK
    if (email === 'admin-mock' || email === 'admin') {
      const mockUser = { id: '00000000-0000-0000-0000-000000000000', email: 'admin@erp.com', user_metadata: { full_name: 'Administrador Demo' } };
      localStorage.setItem('erp_mock_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setSession({ access_token: 'mock-token', user: mockUser });
      writeCache(CACHE_KEY_USER, mockUser);
      try {
        const res = await api.get('/tenants/list', { headers: { 'X-User-ID': mockUser.id } });
        const tenants = res.data || [];
        setUserTenants(tenants);
        writeCache(CACHE_KEY_TENANTS, tenants);
        return { user: mockUser, tenants };
      } catch {
        return { user: mockUser, tenants: [] };
      }
    }

    // Login real Supabase
    const { data: { user: sbUser, session: sbSession }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    setUser(sbUser);
    setSession(sbSession);
    writeCache(CACHE_KEY_USER, sbUser);

    try {
      // Buscar empresas em paralelo com a sessão (não bloqueia o redirect)
      const res = await api.get('/tenants/list', { headers: { 'X-User-ID': sbUser.id } });
      const tenants = res.data || [];
      setUserTenants(tenants);
      writeCache(CACHE_KEY_TENANTS, tenants);
      return { user: sbUser, session: sbSession, tenants };
    } catch {
      return { user: sbUser, session: sbSession, tenants: [] };
    }
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      if (session?.access_token && session.access_token !== 'mock-token') {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[AUTH] Erro ao deslogar:', err.message);
    } finally {
      setUser(null);
      setSession(null);
      setActiveTenant(null);
      setUserTenants([]);
      clearAllCache();
    }
  };

  // ─── TROCA DE EMPRESA (não coloca loading global) ─────────────────────────
  const switchTenant = async (tenantId) => {
    if (!tenantId) { invalidateTenant(); return; }
    // Carrega o tenant escolhido sem spinner global
    try {
      const res = await api.get('/tenants/me', { headers: { 'X-Tenant-ID': tenantId } });
      if (res?.data) {
        setActiveTenant(res.data);
        setLocalTenantId(tenantId);
        writeCache(CACHE_KEY_TENANT, res.data);
      }
    } catch (err) {
      console.error('[AUTH] Erro ao trocar tenant:', err);
    }
  };

  const contextValue = useMemo(() => ({
    user, session, loading, activeTenant, userTenants,
    setActiveTenant: switchTenant,
    login, logout,
    isAuthenticated: !!user,
  }), [user, session, loading, activeTenant, userTenants]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};
