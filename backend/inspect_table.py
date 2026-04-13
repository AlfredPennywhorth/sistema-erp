import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv('backend/.env', override=True)
DATABASE_URL = os.getenv("DATABASE_URL").replace("postgres://", "postgresql://")

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
cols = inspector.get_columns('usuario_empresas')
print("\n--- COLUNAS DE usuario_empresas ---")
for c in cols:
    print(f"Col: {c['name']} | Nullable: {c['nullable']} | Default: {c['default']} | Type: {c['type']}")
