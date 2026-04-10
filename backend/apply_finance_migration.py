import os
import sys
from sqlalchemy import text
from app.models.database import engine

def apply_migration():
    migration_path = os.path.join(os.path.dirname(__file__), 'app', 'models', 'migrations', '2026-04-10_01_financeiro.sql')
    
    if not os.path.exists(migration_path):
        print(f"Erro: Arquivo {migration_path} no encontrado.")
        return

    print(f"Lendo migration de {migration_path}...")
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    # O SQLModel/SQLAlchemy não gosta de comandos múltiplos em uma única chamada de text() 
    # se houver comandos de controle de transação ou múltiplos statements dependendo do driver.
    # Mas o script contém BEGIN/COMMIT. Vamos tentar executar como um bloco único.
    
    print("Aplicando SQL no banco de dados...")
    try:
        with engine.connect() as conn:
            # Removendo BEGIN/COMMIT manuais do SQL pois o engine.connect() pode gerenciar transação
            # ou o driver pode reclamar se houver múltiplos statements.
            # No entanto, o script tem múltiplos CREATE TABLE. 
            # Vamos dividir por ';' se necessário, mas primeiro tentamos o bloco.
            # Para PostgreSQL, geralmente exec é OK com blocos se o driver permitir.
            
            # Vamos limpar o SQL de comentários e BEGIN/COMMIT para simplificar se necessário
            sql_clean = sql.replace('BEGIN;', '').replace('COMMIT;', '')
            
            # Executar
            conn.execute(text(sql_clean))
            conn.commit()
            print("SUCESSO: Migration financeira aplicada.")
    except Exception as e:
        print(f"ERRO ao aplicar migration: {e}")
        # Tentar novamente dividindo os comandos por ';'
        print("Tentando executar comandos individualmente...")
        try:
            with engine.connect() as conn:
                commands = sql.split(';')
                for cmd in commands:
                    cmd_strip = cmd.strip()
                    if cmd_strip and not cmd_strip.startswith('--') and cmd_strip not in ['BEGIN', 'COMMIT']:
                        conn.execute(text(cmd_strip))
                conn.commit()
                print("SUCESSO: Migration financeira aplicada (via comandos individuais).")
        except Exception as e2:
            print(f"ERRO CRTICO: {e2}")

if __name__ == "__main__":
    # Ajustando o path para importar o app
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    apply_migration()
