import sys
import os
from sqlalchemy import text
from app.models.database import engine

def test_connection():
    try:
        print("Tentando conectar ao banco...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            row = result.fetchone()
            print(f"Resultado SELECT 1: {row}")
            if row and row[0] == 1:
                print("CONEXÃO COM BANCO ESTABELECIDA!")
            else:
                print("RESPOSTA INESPERADA DO BANCO.")
    except Exception as e:
        print(f"ERRO DE CONEXÃO: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
