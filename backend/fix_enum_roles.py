import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
conn_url = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
if "sslmode=require" not in conn_url:
    sep = "&" if "?" in conn_url else "?"
    conn_url += f"{sep}sslmode=require"

output = []

try:
    conn = psycopg2.connect(conn_url)
    conn.autocommit = False
    cur = conn.cursor()

    output.append("1. Adicionando valores faltantes ao enum 'userrole'...")

    # PostgreSQL: para adicionar valores a um enum existente
    # Apenas adiciona se não existir
    for val in ['OPERADOR', 'CONTADOR']:
        try:
            cur.execute(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{val}';")
            output.append(f"   + '{val}' adicionado (ou já existia)")
        except Exception as e:
            output.append(f"   ! Erro ao adicionar '{val}': {e}")
            conn.rollback()
            conn.autocommit = False

    conn.commit()

    # Converter dados existentes de OPERATOR -> OPERADOR
    output.append("\n2. Convertendo OPERATOR -> OPERADOR nos dados existentes...")
    conn.autocommit = True

    cur.execute("UPDATE convites SET role = 'OPERADOR' WHERE role::text = 'OPERATOR';")
    output.append(f"   convites atualizados: {cur.rowcount} linhas")

    cur.execute("UPDATE usuario_empresas SET role = 'OPERADOR' WHERE role::text = 'OPERATOR';")
    output.append(f"   usuario_empresas atualizados: {cur.rowcount} linhas")

    output.append("\n3. Verificação final:")
    cur.execute("SELECT DISTINCT role::text FROM convites;")
    output.append(f"   convites roles: {[r[0] for r in cur.fetchall()]}")

    cur.execute("SELECT DISTINCT role::text FROM usuario_empresas;")
    output.append(f"   usuario_empresas roles: {[r[0] for r in cur.fetchall()]}")

    cur.execute("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'userrole' ORDER BY enumsortorder;")
    output.append(f"   enum values: {[r[0] for r in cur.fetchall()]}")

    cur.close()
    conn.close()
    output.append("\nSUCESSO!")
except Exception as e:
    output.append(f"\nERRO CRÍTICO: {e}")

result = "\n".join(output)
print(result)
with open("fix_enum_report.txt", "w", encoding="utf-8") as f:
    f.write(result)
print("\n[Salvo em fix_enum_report.txt]")
