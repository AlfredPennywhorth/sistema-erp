from sqlmodel import Session, create_engine, select
import os
from dotenv import load_dotenv
from app.models.database import Invite, InviteStatus

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def test_db():
    print(f"Testando conexão com: {DATABASE_URL}")
    try:
        with Session(engine) as session:
            stmt = select(Invite)
            invites = session.exec(stmt).all()
            print(f"Total de convites encontrados: {len(invites)}")
            for inv in invites:
                print(f"Token: {inv.token}, Email: {inv.email}, Status: {inv.status}")
    except Exception as e:
        print(f"ERRO AO CONECTAR: {str(e)}")

if __name__ == "__main__":
    test_db()
