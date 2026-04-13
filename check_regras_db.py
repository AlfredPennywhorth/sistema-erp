import os
import sys
from uuid import UUID

# Adiciona o diretório atual ao path para importar o app
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.app.core.auth import get_session
    from backend.app.models.database import RegraContabil
    from sqlmodel import Session, select, create_engine
    
    # Tenta pegar a URL do banco do .env
    from dotenv import load_dotenv
    load_dotenv('backend/.env')
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("DATABASE_URL não encontrada no .env")
        sys.exit(1)
        
    engine = create_engine(database_url)
    
    with Session(engine) as session:
        statement = select(RegraContabil)
        results = session.exec(statement).all()
        
        print(f"Total de regras: {len(results)}")
        for r in results:
            print(f"ID: {r.id} | Evento: {r.tipo_evento} | Natureza: {r.natureza} | Débito: {r.conta_debito_id} | Crédito: {r.conta_credito_id}")
            
except Exception as e:
    print(f"Erro ao consultar banco: {e}")
    import traceback
    traceback.print_exc()
