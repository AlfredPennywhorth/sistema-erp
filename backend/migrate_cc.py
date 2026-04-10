from app.models.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # Coluna Tipo
            conn.execute(text("ALTER TABLE centros_custo ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'ANALITICO'"))
            # Colunas de Auditoria (AuditMixin)
            conn.execute(text("ALTER TABLE centros_custo ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))
            conn.execute(text("ALTER TABLE centros_custo ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))
            # Coluna Hierarquia
            conn.execute(text("ALTER TABLE centros_custo ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES centros_custo(id)"))
            
            conn.commit()
            print("Alterações aplicadas com sucesso!")
            
            # Diagnóstico
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'centros_custo'"))
            cols = [r[0] for r in res]
            print(f"Colunas atuais na tabela 'centros_custo': {cols}")
            
        except Exception as e:
            print(f"Erro na migração: {e}")

if __name__ == "__main__":
    migrate()
