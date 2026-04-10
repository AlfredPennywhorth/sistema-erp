from app.models.database import create_db_and_tables
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    print(f"Sincronizando schema com: {os.getenv('DATABASE_URL')}")
    try:
        create_db_and_tables()
        print("Schema sincronizado com sucesso no Supabase!")
    except Exception as e:
        print(f"Erro ao sincronizar schema: {e}")
