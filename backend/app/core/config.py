import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Configuração de Logs para Diagnóstico
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.core.config")

# Caminho absoluto para o arquivo .env (backend/.env)
# __file__ está em backend/app/core/config.py, subimos 3 níveis para chegar em backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"

# Carregamento centralizado e obrigatório antes de qualquer outra coisa
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
    logger.info(f"Ambiente: Arquivo {env_path} carregado com sucesso.")
else:
    logger.error(f"Ambiente: Arquivo {env_path} NÃO ENCONTRADO!")

class Settings(BaseModel):
    # Banco de dados
    DATABASE_URL: str = Field(default_factory=lambda: os.getenv("DATABASE_URL", ""))
    
    # Supabase
    SUPABASE_URL: str = Field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
    SUPABASE_ANON_KEY: str = Field(default_factory=lambda: os.getenv("SUPABASE_ANON_KEY", ""))
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
    SUPABASE_JWT_SECRET: str = Field(default_factory=lambda: os.getenv("SUPABASE_JWT_SECRET", ""))
    SUPABASE_JWKS_URL: str = Field(default_factory=lambda: os.getenv("SUPABASE_JWKS_URL", ""))
    
    # Frontend
    FRONTEND_URL: str = Field(default_factory=lambda: os.getenv("FRONTEND_URL", "http://localhost:5173"))
    
    # Flags
    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    DEV_MODE: bool = Field(default_factory=lambda: os.getenv("DEV_MODE", "true").lower() == "true")
    ENABLE_MOCK_AUTH: bool = Field(default_factory=lambda: os.getenv("ENABLE_MOCK_AUTH", "false").lower() == "true")
    
    # Resend
    RESEND_API_KEY: str = Field(default_factory=lambda: os.getenv("RESEND_API_KEY", ""))
    
    # Logs
    LOG_LEVEL: str = Field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))

    def masked_jwt_secret(self) -> str:
        s = self.SUPABASE_JWT_SECRET
        if not s: return "[AUSENTE]"
        if len(s) < 10: return f"{s} [MUITO CURTA]"
        return f"{s[:6]}...{s[-4:]} (Tamanho: {len(s)})"

    def masked_service_role(self) -> str:
        s = self.SUPABASE_SERVICE_ROLE_KEY
        if not s: return "[AUSENTE]"
        if len(s) < 10: return "[MUITO CURTA]"
        return f"{s[:10]}...{s[-4:]}"

    def masked_db_url(self) -> str:
        url = self.DATABASE_URL
        if not url: return "[AUSENTE]"
        if "://" not in url: return "[FORMATO INVÁLIDO]"
        # Ocultar senha: postgresql://user:PASSWORD@host:port/db
        try:
            parts = url.split("@")
            if len(parts) > 1:
                protocol_user = parts[0]
                host_db = parts[1]
                proto, user_pass = protocol_user.split("://")
                user = user_pass.split(":")[0]
                return f"{proto}://{user}:****@{host_db}"
            return url[:15] + "..."
        except:
            return "[ERRO AO MASCARAR]"

    @property
    def is_jwt_secret_uuid(self) -> bool:
        # Verifica se o formato parece um UUID (8-4-4-4-12)
        import re
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
        return bool(uuid_pattern.match(self.SUPABASE_JWT_SECRET))

settings = Settings()

# Log de Diagnóstico no Boot
logger.info(f"Config: DATABASE_URL conectada: {settings.masked_db_url()}")
logger.info(f"Config: SUPABASE_SERVICE_ROLE_KEY: {settings.masked_service_role()}")
logger.info(f"Config: SUPABASE_JWT_SECRET carregada: {settings.masked_jwt_secret()}")
if settings.is_jwt_secret_uuid:
    logger.warning("ALERTA: O valor de SUPABASE_JWT_SECRET parece ser um UUID. Segredos do Supabase costumam ser strings Base64 longas.")
else:
    logger.info("Config: O formato do segredo JWT não parece um UUID (o que é esperado para chaves Supabase padrão).")
