import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// 1. Cliente Supabase (Auth e RLS)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('VITE_SUPABASE_URL não configurada corretamente no .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Cliente Axios (Backend FastAPI)
export const api = axios.create({
  // Fallback para localhost:8000 se a variável não estiver no .env
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  timeout: 15000, // Aumentado para 15s para suportar cold starts no Supabase
});

const isDebug = import.meta.env.VITE_DEBUG_MODE === 'true';

// Modo mock — APENAS quando VITE_ENABLE_MOCK_AUTH=true no .env de desenvolvimento local.
// Nunca deve ser true em produção. Requer ENABLE_MOCK_AUTH=true no backend também.
const isEnableMockAuth = import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

// ─── Helpers de Tenant ────────────────────────────────────────────────────────
export const setTenantId = (id) => {
  if (id) localStorage.setItem('erp_tenant_id', id);
  else localStorage.removeItem('erp_tenant_id');
};
export const getTenantId = () => localStorage.getItem('erp_tenant_id');

// ─── Cache de Token (evita chamar getSession() em cada request) ───────────────
let _cachedToken = null;
let _cachedTokenExp = 0; // timestamp em ms

const getCachedToken = async () => {
  const now = Date.now();
  // Reutiliza token se ainda valid por mais de 60s
  if (_cachedToken && _cachedTokenExp - now > 60_000) {
    return _cachedToken;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      _cachedToken = { token: session.access_token, userId: session.user.id };
      // exp em ms (Supabase usa segundos no campo expires_at)
      _cachedTokenExp = (session.expires_at ?? 0) * 1000;
      return _cachedToken;
    }
  } catch { /* silencioso */ }
  return null;
};

// Invalida cache quando Supabase emite evento de refresh/logout
supabase.auth.onAuthStateChange((event) => {
  if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
    _cachedToken = null;
    _cachedTokenExp = 0;
  }
});

// ─── Interceptor de Request ───────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  // 1. Token do usuário (usando cache local para performance)
  try {
    const cached = await getCachedToken();
    if (cached) {
      config.headers.Authorization = `Bearer ${cached.token}`;
      config.headers['X-User-ID'] = cached.userId;
    } else if (isEnableMockAuth) {
      // Fallback mock — ativo APENAS quando VITE_ENABLE_MOCK_AUTH=true
      const mockUserRaw = localStorage.getItem('erp_mock_user');
      if (mockUserRaw) {
        const mockUser = JSON.parse(mockUserRaw);
        if (mockUser?.id) {
          config.headers['X-User-ID'] = mockUser.id;
          config.headers.Authorization = 'Bearer mock-token';
        }
      }
    }
  } catch (err) {
    if (isDebug) console.warn('[AXIOS] Sessão indisponível:', err);
  }

  // 2. Tenant ID para isolamento multi-tenant
  const tenantId = getTenantId();
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }

  return config;
}, (error) => Promise.reject(error));

// ─── Estado global de conectividade ──────────────────────────────────────────
let isOffline = false;

// ─── Interceptor de Response ──────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (isDebug) console.log('✅ [AXIOS] Response:', response.status, response.config?.url);
    // Servidor voltou → notifica UI
    if (isOffline) {
      isOffline = false;
      window.dispatchEvent(new CustomEvent('server-online'));
    }
    return response;
  },
  (error) => {
    const isNetworkError = !error.response;
    const isTimeout = error.code === 'ECONNABORTED';

    if (isNetworkError || isTimeout) {
      // Só dispara o evento se estava online antes (evita spam)
      if (!isOffline) {
        isOffline = true;
        console.error('🚨 [REDE] Backend inacessível:', error.code || 'ERR_NETWORK', error.config?.url);
        window.dispatchEvent(new CustomEvent('server-offline'));
      }
    } else {
      // Request chegou ao servidor → está online
      if (isOffline) {
        isOffline = false;
        window.dispatchEvent(new CustomEvent('server-online'));
      }
      // Log de erro centralizado
      console.error('❌ [API ERROR]:', error.config?.url, error.response?.status, error.response?.data);

      if (isDebug) {
        console.error('❌ [AXIOS] Full Error:', error.response?.status, error.config?.url, error.response?.data);
      }
    }

    return Promise.reject(error);
  }
);
