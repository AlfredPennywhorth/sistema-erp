from app.core.config import settings
import logging
import os
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import tenants, team, contador, financeiro, parceiros, accounting, aplicacoes, emprestimos, relatorios
from app.core.middleware import get_empresa_id_middleware
from app.models.database import create_db_and_tables

# Configuração de Logging baseada em settings
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

async def app_startup():
    logger.info("Iniciando aplicação...")
    logger.info(f"Ambiente: {settings.ENVIRONMENT}")
    logger.info(f"Frontend URL: {settings.FRONTEND_URL}")
    
    # Verificar configuração crítica de segurança na inicialização
    if not settings.SUPABASE_JWT_SECRET:
        logger.warning(
            "SUPABASE_JWT_SECRET não configurado. "
            "Todas as rotas protegidas retornarão 503 Service Unavailable. "
            "Configure SUPABASE_JWT_SECRET antes de usar em produção."
        )
    try:
        create_db_and_tables()
    except Exception as e:
        import traceback
        traceback.print_exc()

app = FastAPI(
    title="Sistema ERP Modular - API",
    description="Backend Multi-tenant com isolamento lógico e conformidade fiscal.",
    version="1.0.0",
    on_startup=[app_startup]
)

# 1. Segurança Multi-tenancy (executado após CORS no fluxo de entrada)
app.middleware("http")(get_empresa_id_middleware)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# --- Rotas ---
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["Onboarding"])
app.include_router(team.router, prefix="/api/v1/team", tags=["Team Management"])
app.include_router(contador.router, prefix="/api/v1/contador", tags=["Accountant Portal"])
app.include_router(financeiro.router, prefix="/api/v1/financeiro", tags=["Módulo Financeiro"])
app.include_router(parceiros.router, prefix="/api/v1/parceiros", tags=["Gestão de Parceiros"])
app.include_router(accounting.router, prefix="/api/v1/accounting", tags=["Contabilidade"])
app.include_router(aplicacoes.router, prefix="/api/v1/aplicacoes", tags=["Aplicações Financeiras"])
app.include_router(emprestimos.router, prefix="/api/v1/emprestimos", tags=["Módulo Empréstimos"])
app.include_router(relatorios.router, prefix="/api/v1/relatorios", tags=["Relatórios"])

@app.get("/api/v1/health", tags=["Infra"])
async def health_check():
    """Endpoint para verificar se le backend está online."""
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
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    except Exception as e:
        import traceback
        logger.critical("Falha ao iniciar servidor: %s", e)
        traceback.print_exc()
        sys.exit(1)
