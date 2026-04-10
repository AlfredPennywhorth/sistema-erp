import os
import sys
import uuid
import asyncio
from typing import Optional
from dotenv import load_dotenv
from sqlmodel import Session, select, create_engine
import httpx

# Adicionar o diretório pai ao path para importar os modelos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.database import User, Empresa, UsuarioEmpresa, UserRole

# Carregar variáveis de ambiente
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not DATABASE_URL:
    print("ERRO: DATABASE_URL não encontrada no .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL.replace("postgres://", "postgresql://") if DATABASE_URL.startswith("postgres://") else DATABASE_URL)

async def check_supabase_user(email: str) -> Optional[str]:
    """Verifica se o usuário existe no Supabase usando a Service Role Key"""
    if not SERVICE_ROLE_KEY or not SUPABASE_URL:
        print("AVISO: SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_URL não configurados. Pulando verificação API.")
        return None

    headers = {
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "apikey": SERVICE_ROLE_KEY
    }
    
    try:
        async with httpx.AsyncClient() as client:
            # Lista usuários para encontrar pelo email
            # Nota: Em produção, filtrar via query params se possível
            print(f"Buscando usuário {email} no Supabase Auth...")
            response = await client.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=headers)
            
            if response.status_code == 200:
                users = response.json().get("users", [])
                for u in users:
                    if u.get("email") == email:
                        return u.get("id")
            else:
                print(f"Erro ao acessar Supabase API: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Falha na comunicação com Supabase: {str(e)}")
    
    return None

def sync_database(email: str, supabase_id: str):
    """Sincroniza o UID do Supabase com o banco local e vincula à primeira empresa found"""
    with Session(engine) as session:
        # 1. Buscar ou Criar Usuário
        user = session.exec(select(User).where(User.email == email)).first()
        
        if not user:
            print(f"Criando novo registro para {email} no banco public...")
            user = User(
                id=uuid.UUID(supabase_id),
                email=email,
                nome="Administrator",
                is_active=True
            )
            session.add(user)
        else:
            print(f"Usuário {email} encontrado. Sincronizando ID...")
            # Como ID é PK, se mudou, precisamos de cuidado. 
            # Se for diferente, vamos atualizar (usando SQL puro se necessário para evitar conflitos de cache da SQLModel)
            if str(user.id) != supabase_id:
                print(f"Atualizando ID de {user.id} para {supabase_id}")
                user.id = uuid.UUID(supabase_id)
                session.add(user)

        session.commit()
        session.refresh(user)

        # 2. Garantir vínculo com Empresa
        empresa = session.exec(select(Empresa)).first()
        if not empresa:
            print("AVISO: Nenhuma empresa encontrada no banco. Crie uma empresa primeiro via onboarding.")
            return

        vinculo = session.exec(
            select(UsuarioEmpresa)
            .where(UsuarioEmpresa.usuario_id == user.id)
            .where(UsuarioEmpresa.empresa_id == empresa.id)
        ).first()

        if not vinculo:
            print(f"Vinculando usuário à empresa {empresa.razao_social} como ADMIN...")
            vinculo = UsuarioEmpresa(
                usuario_id=user.id,
                empresa_id=empresa.id,
                role=UserRole.ADMIN,
                ativo=True
            )
            session.add(vinculo)
        else:
            print(f"Vínculo já existe. Garantindo role ADMIN...")
            vinculo.role = UserRole.ADMIN
            session.add(vinculo)

        session.commit()
        print(f"SUCESSO: Administrador {email} configurado e vinculado à empresa {empresa.razao_social}.")

async def main():
    admin_email = "aws311274@gmail.com"
    print(f"--- Iniciando Correção de Administrador ({admin_email}) ---")
    
    supabase_id = await check_supabase_user(admin_email)
    
    if not supabase_id:
        print("\n!!! ATENÇÃO !!!")
        print(f"Usuário {admin_email} NÃO encontrado no Supabase Auth.")
        print("Ação Requerida: Crie o usuário manualmente no Dashboard do Supabase ou via SignUp no app.")
        print("Depois de criado, rode este script novamente para sincronizar os bancos.")
        return

    sync_database(admin_email, supabase_id)

if __name__ == "__main__":
    asyncio.run(main())
