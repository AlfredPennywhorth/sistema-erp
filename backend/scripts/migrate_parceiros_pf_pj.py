from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

sql = "ALTER TABLE parceiros ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(2) DEFAULT 'PJ';"

with engine.connect() as conn:
    print("Aplicando migração...")
    conn.execute(text(sql))
    conn.commit()
    print("Sucesso!")
