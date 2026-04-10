import os
import sys
from sqlalchemy import create_engine, select, text
from sqlmodel import Session

# Adiciona o diretório atual ao path para importar app
sys.path.append(os.getcwd())

from app.models.database import User, UsuarioEmpresa

# DATABASE_URL direta
db_url = "postgresql://postgres:andremenezes.dev@gmail.com@db.kwolyrimxnxxllebfawe.supabase.co:6543/postgres"
engine = create_engine(db_url)

tenant_id = "5510f802-768f-4d34-95f0-35c167b44964" # ID que vi no log anterior

print(f"--- Testando Query para Tenant: {tenant_id} ---")

with Session(engine) as session:
    try:
        stmt = select(User, UsuarioEmpresa).join(UsuarioEmpresa, User.id == UsuarioEmpresa.usuario_id).where(UsuarioEmpresa.empresa_id == tenant_id)
        print(f"SQL Gerado: {stmt}")
        results = session.exec(stmt).all()
        print(f"Sucesso! Encontrados {len(results)} membros.")
    except Exception as e:
        print("\n!!! ERRO NA QUERY !!!")
        print(str(e))
        import traceback
        traceback.print_exc()
