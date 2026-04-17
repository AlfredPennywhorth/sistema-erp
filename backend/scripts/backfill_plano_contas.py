import sys
import os

# Adiciona o diretório raiz ao path para os imports locais funcionarem
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, select
from app.models.database import engine, Empresa, PlanoConta
from app.services.seeder import SeederService

def backfill():
    with Session(engine) as session:
        empresas = session.exec(select(Empresa)).all()
        for empresa in empresas:
            # Check if this company already has plano_contas
            existing = session.exec(select(PlanoConta).where(PlanoConta.empresa_id == empresa.id)).first()
            if existing:
                print(f"Empresa '{empresa.razao_social}' já possui plano de contas.")
                continue
            
            cnae = empresa.cnae_principal or "0000000"
            if cnae.startswith("45") or cnae.startswith("46") or cnae.startswith("47"):
                segmento = "comercio"
            elif cnae.startswith("1") or cnae.startswith("2") or cnae.startswith("3"):
                segmento = "industria"
            else:
                segmento = "servicos"
                
            print(f"Semeando plano de contas para '{empresa.razao_social}' (Segmento: {segmento})")
            SeederService.seed_plano_contas(session=session, empresa_id=empresa.id, segmento=segmento)
        
        session.commit()
        print("Backfill concluído!")

if __name__ == "__main__":
    backfill()
