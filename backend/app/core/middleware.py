import time
from fastapi import Request
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
import os
import warnings
from uuid import UUID
from sqlmodel import Session, select
from app.models.database import engine, UsuarioEmpresa

ALGORITHM = "HS256"

# Chave secreta do JWT do Supabase — obrigatório para validação de token em produção.
# Obter em: Supabase Dashboard → Settings → API → JWT Secret.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Modo mock — APENAS para desenvolvimento local explícito (nunca ativo por default).
# Habilitar somente definindo ENABLE_MOCK_AUTH=true no .env local de desenvolvimento.
ENABLE_MOCK_AUTH = os.getenv("ENABLE_MOCK_AUTH", "false").lower() in ("1", "true", "yes")

if not SUPABASE_JWT_SECRET:
    warnings.warn(
        "[SECURITY] SUPABASE_JWT_SECRET não configurado. "
        "Todas as rotas protegidas rejeitarão autenticação. "
        "Configure a variável de ambiente SUPABASE_JWT_SECRET.",
        RuntimeWarning,
        stacklevel=1,
    )

if ENABLE_MOCK_AUTH:
    warnings.warn(
        "[SECURITY] ENABLE_MOCK_AUTH=true ativo. "
        "Modo de autenticação mock habilitado — NÃO use em produção.",
        RuntimeWarning,
        stacklevel=1,
    )

# Rotas que não precisam de autenticação.
# Manter a lista mínima e explícita — nenhuma rota fictícia ou administrativa aqui.
# ATENÇÃO: não incluir "/" ou "" aqui pois "startswith('/')" é verdadeiro para todos os paths.
PUBLIC_PATHS = [
    "/api/v1/tenants/setup",
    "/api/v1/tenants/check-cnpj",
    "/api/v1/team/invite-details",
    "/api/v1/team/finalize-registration",
    "/api/v1/health",
    "/api/v1/auth",
]


def _unauthorized(detail: str) -> JSONResponse:
    return JSONResponse(status_code=401, content={"detail": detail})


def _forbidden(detail: str) -> JSONResponse:
    return JSONResponse(status_code=403, content={"detail": detail})


def _bad_request(detail: str) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": detail})


def _service_unavailable(detail: str) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": detail})


async def get_empresa_id_middleware(request: Request, call_next):
    # 0. BYPASS para OPTIONS (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path.rstrip("/")

    # 1. BYPASS TOTAL para rotas públicas.
    # Usar correspondência exata para "/" e "" para evitar que "startswith('/')" vaze para todos os paths.
    # "/" é público pois é o endpoint raiz de status do serviço (não expõe dados).
    if path in ("/", "") or any(path.startswith(p) for p in PUBLIC_PATHS):
        return await call_next(request)

    # 2. Inicializar state padrão
    request.state.user_id = None
    request.state.empresa_id = None
    request.state.user_role = None

    # 3. Extração de identidade do usuário — JWT exclusivamente
    #    A identidade nunca é aceita por header arbitrário (X-User-ID) em produção.
    auth_header = request.headers.get("Authorization", "")
    x_tenant_id = request.headers.get("X-Tenant-ID", "")

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]

        # --- Modo Mock (desenvolvimento local explícito) ---
        # Ativo somente quando ENABLE_MOCK_AUTH=true no ambiente.
        if token == "mock-token" and ENABLE_MOCK_AUTH:
            x_user_id = request.headers.get("X-User-ID", "")
            if not x_user_id:
                return _unauthorized("Modo mock requer X-User-ID válido.")
            try:
                UUID(x_user_id)
                request.state.user_id = x_user_id
            except ValueError:
                return _bad_request("X-User-ID inválido no modo mock.")

        # --- Validação JWT real ---
        elif token:
            if not SUPABASE_JWT_SECRET:
                return _service_unavailable(
                    "Serviço de autenticação não configurado (SUPABASE_JWT_SECRET ausente)."
                )
            try:
                payload = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=[ALGORITHM],
                    options={"verify_aud": False},
                )
                request.state.user_id = payload.get("sub")
            except JWTError:
                return _unauthorized("Token de autenticação inválido ou expirado.")

    # 4. Rejeitar requisição se não foi possível identificar o usuário
    if not request.state.user_id:
        return _unauthorized(
            "Autenticação obrigatória. Forneça um token JWT válido no header Authorization."
        )

    # 5. Tenant via header (contexto multi-empresa)
    if x_tenant_id:
        try:
            UUID(x_tenant_id)
            request.state.empresa_id = x_tenant_id
        except ValueError:
            return _bad_request("X-Tenant-ID inválido (UUID esperado).")

    # 6. VALIDAÇÃO DO VÍNCULO (Multi-tenancy N:N) — somente quando user + empresa presentes
    if request.state.user_id and request.state.empresa_id:
        try:
            with Session(engine) as session:
                user_uuid    = UUID(str(request.state.user_id))
                empresa_uuid = UUID(str(request.state.empresa_id))

                stmt = select(UsuarioEmpresa).where(
                    UsuarioEmpresa.usuario_id == user_uuid,
                    UsuarioEmpresa.empresa_id == empresa_uuid,
                    UsuarioEmpresa.ativo == True,
                )
                vinculo = session.exec(stmt).first()

                if not vinculo:
                    return _forbidden(
                        "Acesso negado: você não possui vínculo ativo com esta empresa."
                    )

                request.state.user_role = vinculo.role

        except ValueError:
            return _bad_request("IDs de usuário ou empresa malformados.")
        except Exception:
            return JSONResponse(
                status_code=500, content={"detail": "Erro interno ao validar permissões."}
            )

    # 7. Segregação de Funções (SoD) para Contador
    if request.state.user_role == "CONTADOR":
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            if not request.url.path.startswith("/api/v1/contador"):
                return _forbidden(
                    "Contadores possuem permissão de escrita apenas no Portal do Contador."
                )

    return await call_next(request)
