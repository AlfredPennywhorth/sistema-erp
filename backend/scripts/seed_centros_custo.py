import asyncio
from sqlmodel import Session, select
import sys
import os
from uuid import UUID

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import engine, CentroCusto, Empresa, TipoCentroCusto

def seed_centros_custo():
    with Session(engine) as session:
        # Busca a primeira empresa para associar os centros (Tenant padrão)
        empresa = session.exec(select(Empresa)).first()
        if not empresa:
            print("Nenhuma empresa encontrada para o seed.")
            return
        
        tenant_id = empresa.id
        print(f"Populando Centros de Custo para a empresa: {empresa.razao_social} ({tenant_id})")

        estrutura = [
            {
                "codigo": "100", 
                "nome": "ADMINISTRATIVO", 
                "tipo": TipoCentroCusto.SINTETICO,
                "filhos": [
                    {"codigo": "100.1", "nome": "Escritório / Geral", "tipo": TipoCentroCusto.ANALITICO}
                ]
            },
            {
                "codigo": "200", 
                "nome": "OPERACIONAL", 
                "tipo": TipoCentroCusto.SINTETICO,
                "filhos": [
                    {"codigo": "200.1", "nome": "Produção / Serviços", "tipo": TipoCentroCusto.ANALITICO}
                ]
            },
            {
                "codigo": "300", 
                "nome": "COMERCIAL", 
                "tipo": TipoCentroCusto.SINTETICO,
                "filhos": [
                    {"codigo": "300.1", "nome": "Vendas e Marketing", "tipo": TipoCentroCusto.ANALITICO}
                ]
            }
        ]

        for pai_data in estrutura:
            # Verifica se já existe
            pai = session.exec(select(CentroCusto).where(
                CentroCusto.codigo == pai_data["codigo"],
                CentroCusto.empresa_id == tenant_id
            )).first()

            if not pai:
                pai = CentroCusto(
                    empresa_id=tenant_id,
                    codigo=pai_data["codigo"],
                    nome=pai_data["nome"],
                    tipo=pai_data["tipo"]
                )
                session.add(pai)
                session.flush() # Para gerar o ID do pai
                print(f"Pai criado: {pai.codigo} - {pai.nome}")
            else:
                print(f"Pai ignorado (já existe): {pai.codigo}")

            for filho_data in pai_data["filhos"]:
                filho = session.exec(select(CentroCusto).where(
                    CentroCusto.codigo == filho_data["codigo"],
                    CentroCusto.empresa_id == tenant_id
                )).first()

                if not filho:
                    filho = CentroCusto(
                        empresa_id=tenant_id,
                        codigo=filho_data["codigo"],
                        nome=filho_data["nome"],
                        tipo=filho_data["tipo"],
                        parent_id=pai.id
                    )
                    session.add(filho)
                    print(f"  > Filho criado: {filho.codigo} - {filho.nome}")
                else:
                    print(f"  > Filho ignorado (já existe): {filho.codigo}")

        session.commit()
        print("Seed de Centros de Custo finalizado com sucesso!")

if __name__ == "__main__":
    seed_centros_custo()
