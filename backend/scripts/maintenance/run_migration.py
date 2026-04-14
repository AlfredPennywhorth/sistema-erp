import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not found")
    exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)

sql_file = "migrations/20260411_create_regras_contabeis.sql"

with open(sql_file, "r", encoding="utf-8") as f:
    sql = f.read()

with engine.connect() as conn:
    print(f"Executando {sql_file}...")
    # Executamos o script SQL. SQLAlchemy text() pode ter problemas com DO blocks complexos, 
    # mas o driver psycopg2/asyncpg costuma aceitar. 
    # Vamos executar em blocos se necessário ou tentar direto.
    try:
        conn.execute(text(sql))
        conn.commit()
        print("Migration executada com sucesso!")
    except Exception as e:
        print(f"Erro ao executar migration: {e}")
        exit(1)
