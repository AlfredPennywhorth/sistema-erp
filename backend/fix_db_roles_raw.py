import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def fix_roles_raw():
    print(f"Conectando ao banco para corrigir roles (RAW SQL)...")
    
    conn_url = DATABASE_URL
    if "postgresql+psycopg2://" in conn_url:
        conn_url = conn_url.replace("postgresql+psycopg2://", "postgresql://")
        
    try:
        # Adicionando sslmode=require explicitamente se for Supabase
        if "sslmode=require" not in conn_url:
            separator = "&" if "?" in conn_url else "?"
            conn_url += f"{separator}sslmode=require"

        conn = psycopg2.connect(conn_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        # 1. Corrigir convites
        print("Executando UPDATE em 'convites'...")
        cur.execute("UPDATE convites SET role = 'OPERADOR' WHERE role = 'OPERATOR';")
        print(f"Linhas alteradas em convites: {cur.rowcount}")
        
        # 2. Corrigir usuario_empresas
        print("Executando UPDATE em 'usuario_empresas'...")
        cur.execute("UPDATE usuario_empresas SET role = 'OPERADOR' WHERE role = 'OPERATOR';")
        print(f"Linhas alteradas em usuario_empresas: {cur.rowcount}")
        
        # 3. Verificar o status atual
        cur.execute("SELECT DISTINCT role FROM convites;")
        roles_c = cur.fetchall()
        print(f"Roles atuais em convites: {roles_c}")

        cur.execute("SELECT DISTINCT role FROM usuario_empresas;")
        roles_ue = cur.fetchall()
        print(f"Roles atuais em usuario_empresas: {roles_ue}")

        cur.close()
        conn.close()
        print("SUCESSO: Roles corrigidas via RAW SQL.")
        
    except Exception as e:
        print(f"ERRO CRÍTICO AO CORRIGIR: {str(e)}")

if __name__ == "__main__":
    fix_roles_raw()
