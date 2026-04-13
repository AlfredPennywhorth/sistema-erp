import os
from dotenv import load_dotenv
from sqlmodel import create_engine, text

load_dotenv(override=True)

def diag_db():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("[ERRO] DATABASE_URL não definida no .env")
        return

    print(f"Tentando conectar ao banco: {url.split('@')[-1]}")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database();"))
            db_name = result.scalar()
            print(f"[OK] Conexão bem-sucedida ao banco: {db_name}")
            
            # Verificar tabelas críticas
            tables = ["usuarios", "empresas", "lancamentos_financeiros"]
            for t in tables:
                try:
                    conn.execute(text(f"SELECT 1 FROM {t} LIMIT 1"))
                    print(f"[OK] Tabela '{t}' existe.")
                except Exception:
                    print(f"[AVISO] Tabela '{t}' não encontrada ou vazia.")
                    
    except Exception as e:
        print(f"[FALHA] Erro de conexão: {e}")

if __name__ == "__main__":
    diag_db()
