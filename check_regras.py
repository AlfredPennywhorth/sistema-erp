from sqlmodel import Session, create_engine, select
from app.models.database import RegraContabil
import os

DATABASE_URL = "sqlite:///backend/sql_app.db"
engine = create_engine(DATABASE_URL)

def check_rules():
    with Session(engine) as session:
        regras = session.exec(select(RegraContabil)).all()
        for r in regras:
            print(f"ID: {r.id} | Evento: {r.tipo_evento} | Natureza: {r.natureza} | Ativo: {r.ativo}")

if __name__ == "__main__":
    check_rules()
