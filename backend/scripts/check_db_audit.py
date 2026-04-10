import os
from sqlalchemy import create_engine, select, text
from app.models.database import engine, User, UsuarioEmpresa, Empresa

# Testa a conexão e a existência das colunas
connection_string = os.getenv("DATABASE_URL", "postgresql://postgres:andremenezes.dev@gmail.com@db.kwolyrimxnxxllebfawe.supabase.co:6543/postgres")

engine_test = create_engine(connection_string)

try:
    with engine_test.connect() as conn:
        print("--- Conexão OK ---")
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuario_empresa';"))
        columns = [row[0] for row in res]
        print(f"Colunas encontradas: {columns}")
        
        has_audit = 'criado_em' in columns and 'atualizado_em' in columns
        if not has_audit:
            print("--- Colunas de Auditoria FALTANDO. Criando... ---")
            conn.execute(text("ALTER TABLE usuario_empresa ADD COLUMN criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
            conn.execute(text("ALTER TABLE usuario_empresa ADD COLUMN atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
            conn.commit()
            print("--- Colunas criadas com sucesso! ---")
        else:
            print("--- Colunas de Auditoria já existem. ---")

except Exception as e:
    print(f"Erro no teste de banco: {str(e)}")
