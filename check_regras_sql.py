import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('backend/.env')
database_url = os.getenv('DATABASE_URL')

if not database_url:
    print("DATABASE_URL não encontrada no .env")
    sys.exit(1)

engine = create_engine(database_url)

query = text("""
    SELECT id, tipo_evento, natureza, conta_debito_id, conta_credito_id 
    FROM regras_contabeis 
    WHERE ativo = true
""")

try:
    with engine.connect() as conn:
        result = conn.execute(query)
        rows = result.fetchall()
        print(f"Total de regras ativas: {len(rows)}")
        for row in rows:
            print(f"ID: {row.id} | Evento: {row.tipo_evento} | Natureza: {row.natureza} | Débito: {row.conta_debito_id} | Crédito: {row.conta_credito_id}")
except Exception as e:
    print(f"Erro ao consultar: {e}")
