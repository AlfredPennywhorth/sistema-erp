
import os
from dotenv import load_dotenv
from sqlmodel import Session, select, create_engine
from sqlalchemy.pool import NullPool
from uuid import UUID

# Carregar ambiente
load_dotenv(override=True)
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Testando conexão com: {DATABASE_URL.split('@')[-1]}")

engine = create_engine(DATABASE_URL, poolclass=NullPool)

# ID que o frontend costuma usar (Admin Mock ou Real)
# Vou tentar listar empresas de qualquer usuário que exista
from app.models.database import Empresa, UsuarioEmpresa, User

with Session(engine) as session:
    print("Tentando buscar usuários...")
    users = session.exec(select(User).limit(5)).all()
    print(f"Usuários encontrados: {len(users)}")
    
    if users:
        user_id = users[0].id
        print(f"Testando query de listagem para user: {user_id}")
        stmt = select(Empresa).join(UsuarioEmpresa).where(UsuarioEmpresa.usuario_id == user_id)
        try:
            results = session.exec(stmt).all()
            print(f"Sucesso! Encontradas {len(results)} empresas.")
        except Exception as e:
            print(f"ERRO NA QUERY: {e}")
    else:
        print("Nenhum usuário no banco para testar.")
