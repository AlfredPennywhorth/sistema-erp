import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if "supabase.co" in DATABASE_URL and "sslmode=" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{separator}sslmode=require"

engine = create_engine(DATABASE_URL)

def run_diag():
    with engine.connect() as conn:
        print("\n--- DIAGNÓSTICO SUPABASE (POSTGRESQL) ---")
        
        # 1. Verificar Usuários
        print("\n[USUÁRIOS]")
        res = conn.execute(text("SELECT id, email, nome FROM usuarios"))
        users = res.fetchall()
        for u in users:
            print(f"ID: {u[0]} | Email: {u[1]} | Nome: {u[2]}")
        
        # 2. Verificar Empresas
        print("\n[EMPRESAS]")
        res = conn.execute(text("SELECT id, razao_social, cnpj FROM empresas"))
        empresas = res.fetchall()
        for e in empresas:
            print(f"ID: {e[0]} | Razão: {e[1]} | CNPJ: {e[2]}")
            
        # 3. Verificar Vínculos (Multi-company)
        print("\n[VÍNCULOS USUÁRIO-EMPRESA]")
        res = conn.execute(text("SELECT usuario_id, empresa_id, role FROM usuario_empresas"))
        vinculos = res.fetchall()
        for v in vinculos:
            print(f"User: {v[0]} -> Empresa: {v[1]} | Role: {v[2]}")

if __name__ == "__main__":
    try:
        run_diag()
    except Exception as e:
        print(f"Erro no diagnóstico: {e}")
