import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
conn_url = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
if "sslmode=require" not in conn_url:
    sep = "&" if "?" in conn_url else "?"
    conn_url += f"{sep}sslmode=require"

try:
    conn = psycopg2.connect(conn_url)
    conn.autocommit = True
    cur = conn.cursor()

    # Ver tipo da coluna role em convites
    cur.execute("""
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name IN ('convites', 'usuario_empresas')
          AND column_name = 'role';
    """)
    print("=== TIPO DA COLUNA ROLE ===")
    for row in cur.fetchall():
        print(row)

    # Ver valores distintos de role em cada tabela
    cur.execute("SELECT DISTINCT role::text FROM convites;")
    print("\n=== ROLES em convites ===")
    for row in cur.fetchall():
        print(row)

    cur.execute("SELECT DISTINCT role::text FROM usuario_empresas;")
    print("\n=== ROLES em usuario_empresas ===")
    for row in cur.fetchall():
        print(row)

    # Se for enum, listar os valores válidos
    cur.execute("""
        SELECT t.typname, e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname ILIKE '%role%' OR t.typname ILIKE '%user%'
        ORDER BY t.typname, e.enumsortorder;
    """)
    print("\n=== ENUM TYPES ===")
    for row in cur.fetchall():
        print(row)

    cur.close()
    conn.close()
except Exception as e:
    print(f"ERRO: {e}")
