from sqlmodel import Session, select
from app.models.database import engine, HonorariosContador, Empresa, User
from uuid import UUID

def verify():
    with Session(engine) as session:
        # Check Honorarios
        honorarios = session.exec(select(HonorariosContador)).all()
        print(f"Total de honorários: {len(honorarios)}")
        for h in honorarios:
            print(f"ID: {h.id}, Valor: {h.valor}, Status: {h.status_pagamento}")
        
        # Check Companies
        empresas = session.exec(select(Empresa)).all()
        print(f"Total de empresas: {len(empresas)}")
        for e in empresas:
            print(f"Empresa: {e.razao_social}, CNPJ: {e.cnpj}")

if __name__ == "__main__":
    verify()
