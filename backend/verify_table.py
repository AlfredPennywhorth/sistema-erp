import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)

with engine.connect() as conn:
    print("\n--- COLUNAS DE regras_contabeis ---")
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'regras_contabeis' ORDER BY ordinal_position"))
    for row in res:
        print(f"{row[0]}: {row[1]}")
    
    print("\n--- CONSTRAINTS ---")
    res = conn.execute(text("SELECT conname, contype FROM pg_constraint WHERE conrelid = 'regras_contabeis'::regclass"))
    for row in res:
        print(f"{row[0]}: {row[1]}")
