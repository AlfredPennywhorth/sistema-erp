import sys
import os
# Adiciona o diretório atual ao path para importar a app
sys.path.append(os.getcwd())

from app.models.database import engine
from sqlalchemy import text

def migrate():
    print("--- INICIANDO MIGRAÇÃO MANUAL: plano_contas ---")
    try:
        with engine.connect() as conn:
            print("Executando: ALTER TABLE plano_contas ADD COLUMN ativo...")
            conn.execute(text("ALTER TABLE plano_contas ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;"))
            
            print("Executando: Campos de Auditoria...")
            conn.execute(text("ALTER TABLE plano_contas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            conn.execute(text("ALTER TABLE plano_contas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            
            conn.commit()
            print("--- SUCESSO: Estrutura atualizada! ---")
    except Exception as e:
        print(f"--- ERRO NA MIGRAÇÃO: {str(e)} ---")

if __name__ == "__main__":
    migrate()
