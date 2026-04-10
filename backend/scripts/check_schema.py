import os
from sqlmodel import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def check_table(table_name):
    print(f"\n--- Estrutura da Tabela: {table_name} ---")
    with engine.connect() as conn:
        try:
            # Query para Postgres (Supabase) com filtro de schema public
            query = text(f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{table_name}' AND table_schema = 'public';")
            result = conn.execute(query).fetchall()
            if not result:
                print(f"ERRO: Tabela '{table_name}' não encontrada no schema public.")
                return
            for row in result:
                print(f"Col: {row[0]:<20} | Tipo: {row[1]:<15} | Null: {row[2]}")
        except Exception as e:
            print(f"ERRO ao ler {table_name}: {str(e)}")

if __name__ == "__main__":
    check_table("usuario_empresas")
    check_table("convites")
    check_table("usuarios")
    check_table("empresas")
