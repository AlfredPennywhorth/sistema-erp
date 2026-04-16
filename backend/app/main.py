from dotenv import load_dotenv
load_dotenv(override=True)
import os

db_url = os.getenv("DATABASE_URL", "")
db_host = db_url.split("@")[-1].split(":")[0] if "@" in db_url else "N/A"
print(f"\n[CONFIRMAÇÃO] DB HOST: {db_host}\n")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from datetime import datetime
from app.api.v1.endpoints import tenants, team, contador, financeiro, parceiros, accounting, emprestimos
from app.core.middleware import get_empresa_id_middleware
from app.models.database import create_db_and_tables

app = FastAPI(
    title="Sistema ERP Modular - API",
    description="Backend Multi-tenant com isolamento lógico e conformidade fiscal.",
    version="1.0.0"
)

@app.on_event("startup")
def on_startup():
    print("--- [STARTUP] Verificando Variáveis de Ambiente... ---")
    db_url = os.getenv('DATABASE_URL', '')
    # Ocultar senha mas mostrar protocolo e host para diagnóstico
    safe_db_url = db_url.split('@')[-1] if '@' in db_url else db_url
    print(f"--- [STARTUP] DATABASE_URL (Host): {safe_db_url} ---")
    print("--- [STARTUP] Inicializando Banco de Dados... ---")
    try:
        from app.models.database import create_db_and_tables
        create_db_and_tables()
        print("--- [STARTUP] Banco de Dados Pronto! ---")
    except Exception as e:
        print(f"--- [STARTUP] ERRO CRÍTICO no Banco de Dados: {str(e)} ---")
        import traceback
        traceback.print_exc()

# --- MIDDLEWARES ---

# 1. Registro de Segurança Multi-tenancy (Deve vir antes do CORS no código para ser executado depois na requisição)
app.middleware("http")(get_empresa_id_middleware)

# 2. Middleware de Log de Diagnóstico
@app.middleware("http")
async def log_requests(request, call_next):
    print(f">>> [API LOG] {request.method} {request.url}")
    response = await call_next(request)
    print(f"<<< [API LOG] Response: {response.status_code}")
    return response

# 3. Configuração de CORS (ADICIONADO POR ÚLTIMO = EXECUTADO PRIMEIRO)
# Expandido para aceitar variações de portas comuns em desenvolvimento caso a 5173 esteja ocupada.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 3. Registro de Rotas
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["Onboarding"])
app.include_router(team.router, prefix="/api/v1/team", tags=["Team Management"])
app.include_router(contador.router, prefix="/api/v1/contador", tags=["Accountant Portal"])
app.include_router(financeiro.router, prefix="/api/v1/financeiro", tags=["Módulo Financeiro"])
app.include_router(parceiros.router, prefix="/api/v1/parceiros", tags=["Gestão de Parceiros"])
app.include_router(accounting.router, prefix="/api/v1/accounting", tags=["Contabilidade"])
app.include_router(emprestimos.router, prefix="/api/v1/emprestimos", tags=["Módulo Empréstimos"])

@app.get("/api/v1/health", tags=["Infra"])
async def health_check():
    """Endpoint ultra-leve para o frontend verificar se o backend está vivo."""
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "ERP Core",
        "compliance": "LGPD / SPED / Multi-tenant"
    }

if __name__ == "__main__":
    import uvicorn
    import sys
    try:
        print("\n--- [STARTUP] Iniciando Uvicorn na porta 8000... ---")
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    except Exception as e:
        print(f"\n--- [ERRO CRÍTICO] Falha ao iniciar servidor: {e} ---")
        sys.exit(1)
