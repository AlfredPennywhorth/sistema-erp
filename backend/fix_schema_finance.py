import os
from sqlalchemy import text
from app.models.database import engine

def fix_schema():
    print("Corrigindo schema financeiro...")
    try:
        with engine.connect() as conn:
            # Adicionar saldo_atual em contas_bancarias
            conn.execute(text("ALTER TABLE contas_bancarias ADD COLUMN IF NOT EXISTS saldo_atual DECIMAL(18,2) DEFAULT 0;"))
            
            # Adicionar forma_pagamento_id em lancamentos_financeiros
            conn.execute(text("ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS forma_pagamento_id UUID REFERENCES formas_pagamento(id);"))
            
            conn.commit()
            print("SUCESSO: Schema corrigido.")
    except Exception as e:
        print(f"ERRO: {e}")

if __name__ == "__main__":
    fix_schema()
