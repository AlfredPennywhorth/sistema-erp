import os
import psycopg2
from dotenv import load_dotenv
import sys

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
conn_url = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
if "sslmode=require" not in conn_url:
    sep = "&" if "?" in conn_url else "?"
    conn_url += f"{sep}sslmode=require"

output = []

try:
    conn = psycopg2.connect(conn_url)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name IN ('convites', 'usuario_empresas') AND column_name = 'role';")
    output.append("=== TIPO DA COLUNA ROLE ===")
    for row in cur.fetchall():
        output.append(str(row))

    cur.execute("SELECT DISTINCT role::text FROM convites;")
    output.append("=== ROLES em convites ===")
    for row in cur.fetchall():
        output.append(str(row))

    cur.execute("SELECT DISTINCT role::text FROM usuario_empresas;")
    output.append("=== ROLES em usuario_empresas ===")
    for row in cur.fetchall():
        output.append(str(row))

    cur.execute("""
        SELECT t.typname, e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname ILIKE '%role%' OR t.typname ILIKE '%user%'
        ORDER BY t.typname, e.enumsortorder;
    """)
    output.append("=== ENUM TYPES ===")
    for row in cur.fetchall():
        output.append(str(row))

    cur.close()
    conn.close()
except Exception as e:
    output.append(f"ERRO: {e}")

result = "\n".join(output)
print(result)
with open("roles_report.txt", "w", encoding="utf-8") as f:
    f.write(result)
print("Salvo em roles_report.txt")
