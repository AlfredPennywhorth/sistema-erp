import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def fix_roles():
    print(f"Conectando ao banco para corrigir roles...")
    # SQLModel use sqlalchemy which uses psycopg2 in the URL
    # We can use the simple connection if we strip the driver prefix if necessary, 
    # but psycopg2 usually handles the postgres:// or postgresql:// URLs.
    
    conn_url = DATABASE_URL
    if "postgresql+psycopg2://" in conn_url:
        conn_url = conn_url.replace("postgresql+psycopg2://", "postgresql://")
        
    try:
        conn = psycopg2.connect(conn_url)
        cur = conn.cursor()
        
        # 1. Corrigir convites
        print("Corrigindo tabela 'convites'...")
        cur.execute("UPDATE convites SET role = 'OPERADOR' WHERE role = 'OPERATOR';")
        print(f"Linhas alteradas em convites: {cur.rowcount}")
        
        # 2. Corrigir usuario_empresas
        print("Corrigindo tabela 'usuario_empresas'...")
        cur.execute("UPDATE usuario_empresas SET role = 'OPERADOR' WHERE role = 'OPERATOR';")
        print(f"Linhas alteradas em usuario_empresas: {cur.rowcount}")
        
        conn.commit()
        cur.close()
        conn.close()
        print("SUCESSO: Roles corrigidas.")
        
    except Exception as e:
        print(f"ERRO AO CORRIGIR: {str(e)}")

if __name__ == "__main__":
    fix_roles()
