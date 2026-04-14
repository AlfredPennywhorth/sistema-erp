import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)
inspector = inspect(engine)

columns = inspector.get_columns('usuarios')
print(f"Colunas da tabela 'usuarios':")
for col in columns:
    print(f"- {col['name']} ({col['type']})")
