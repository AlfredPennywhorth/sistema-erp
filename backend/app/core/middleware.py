import time
from fastapi import Request, HTTPException
from jose import jwt
import os
from uuid import UUID
from sqlmodel import Session, select
from app.models.database import engine, UsuarioEmpresa

# Chave secreta do Supabase (JWT Secret)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "minha-chave-secreta-placeholder")
ALGORITHM = "HS256"

# Rotas que não precisam de autenticação alguma
PUBLIC_PATHS = [
    "/api/v1/tenants/setup",
    "/api/v1/tenants/list",
    "/api/v1/tenants/check-cnpj",
    "/api/v1/team/invite-details",
    "/api/v1/team/finalize-registration",
    "/api/v1/contador/login",
    "/api/v1/health",
    "/api/v1/auth",
    "/",
    "",
]

async def get_empresa_id_middleware(request: Request, call_next):
    start_time = time.time()
    path = request.url.path.rstrip('/')

    # 0. BYPASS para OPTIONS (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)

    print(f">>> [MIDDLEWARE START] {request.method} {path}")

    # 1. BYPASS TOTAL para rotas públicas
    if any(path.startswith(p) for p in PUBLIC_PATHS) or path == "/":
        response = await call_next(request)
        print(f"<<< [MIDDLEWARE END] {path} (PUBLIC) {time.time() - start_time:.4f}s")
        return response

    # 2. Inicializar state padrão
    request.state.user_id = None
    request.state.empresa_id = None
    request.state.user_role = None

    # 3. Extração de identidade do usuário — JWT primeiro, X-User-ID como fallback
    auth_header = request.headers.get("Authorization", "")
    x_user_id   = request.headers.get("X-User-ID", "")
    x_tenant_id = request.headers.get("X-Tenant-ID", "")

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        if token and token != "mock-token":
            try:
                payload = jwt.decode(
                    token, SUPABASE_JWT_SECRET,
                    algorithms=[ALGORITHM],
                    options={"verify_aud": False}
                )
                request.state.user_id = payload.get("sub")
                # Se o JWT carrega empresa_id e não veio header, usa o do token
                if not x_tenant_id:
                    request.state.empresa_id = payload.get("empresa_id")
            except Exception as e:
                print(f"[AUTH] JWT decode falhou: {e}")
                # Não bloqueia — tenta fallback abaixo

    # Fallback: aceita X-User-ID quando JWT ausente ou inválido (dev/mock/supabase real sem secret)
    if not request.state.user_id and x_user_id:
        try:
            UUID(x_user_id)  # valida formato
            request.state.user_id = x_user_id
            print(f"[AUTH] Autenticado via X-User-ID header: {x_user_id[:8]}...")
        except ValueError:
            pass

    # 4. Tenant via header (contexto multi-empresa)
    if x_tenant_id:
        # Segurança: só aceita tenant se conseguimos identificar o usuário
        if not request.state.user_id:
            print(f"[SECURITY] X-Tenant-ID presente mas sem user_id — rejeitando")
            raise HTTPException(
                status_code=401,
                detail="Autenticação obrigatória para especificar tenant."
            )
        try:
            UUID(x_tenant_id)  # valida formato
            request.state.empresa_id = x_tenant_id
        except ValueError:
            raise HTTPException(status_code=400, detail="X-Tenant-ID inválido (UUID esperado)")

    # 5. VALIDAÇÃO DO CRACHÁ (Multi-tenancy N:N) — só se temos user + empresa
    if request.state.user_id and request.state.empresa_id:
        try:
            with Session(engine) as session:
                user_uuid    = UUID(str(request.state.user_id))
                empresa_uuid = UUID(str(request.state.empresa_id))

                stmt = select(UsuarioEmpresa).where(
                    UsuarioEmpresa.usuario_id == user_uuid,
                    UsuarioEmpresa.empresa_id == empresa_uuid,
                    UsuarioEmpresa.ativo == True
                )
                vinculo = session.exec(stmt).first()

                if not vinculo:
                    print(f"[SECURITY] BLOQUEIO: User {str(user_uuid)[:8]} sem vínculo com Empresa {str(empresa_uuid)[:8]}")
                    raise HTTPException(
                        status_code=403,
                        detail="Acesso negado: você não possui vínculo ativo com esta empresa."
                    )

                request.state.user_role = vinculo.role
                print(f"[AUTH] Vínculo OK: {str(user_uuid)[:8]} é {vinculo.role}")

        except ValueError:
            raise HTTPException(status_code=400, detail="IDs de usuário ou empresa malformados.")
        except HTTPException:
            raise
        except Exception as e:
            print(f"[AUTH] Erro sistêmico na validação de vínculo: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao validar permissões.")

    # 6. Segregação de Funções (SoD) para Contador
    if request.state.user_role == "CONTADOR":
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            if not request.url.path.startswith("/api/v1/contador"):
                raise HTTPException(
                    status_code=403,
                    detail="Contadores possuem permissão de escrita apenas no Portal do Contador."
                )

    response = await call_next(request)
    print(f"<<< [MIDDLEWARE END] {path} {response.status_code} {time.time() - start_time:.4f}s")
    return response
