from app.models.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text('''
    SELECT
        tc.constraint_name, tc.table_name, kcu.column_name, tc.constraint_type
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
    WHERE constraint_type = 'UNIQUE' AND tc.table_name = 'empresas' AND kcu.column_name = 'cnpj';
    '''))
    
    print("UNIQUE CONSTRAINTS:", res.fetchall())
    
    res = conn.execute(text('SELECT id, razao_social, cnpj FROM empresas ORDER BY razao_social;'))
    print("EMPRESAS:", res.fetchall())
