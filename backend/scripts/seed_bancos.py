import asyncio
from sqlmodel import Session, select
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import engine, Banco

bancos_list = [
    {"codigo_bacen": "001", "nome": "Banco do Brasil S.A."},
    {"codigo_bacen": "104", "nome": "Caixa Econômica Federal"},
    {"codigo_bacen": "033", "nome": "Banco Santander (Brasil) S.A."},
    {"codigo_bacen": "237", "nome": "Banco Bradesco S.A."},
    {"codigo_bacen": "341", "nome": "Itaú Unibanco S.A."},
    {"codigo_bacen": "260", "nome": "Nubank - Nu Pagamentos S.A."},
    {"codigo_bacen": "077", "nome": "Banco Inter S.A."},
    {"codigo_bacen": "336", "nome": "C6 Bank S.A."},
    {"codigo_bacen": "212", "nome": "Banco Original S.A."},
    {"codigo_bacen": "074", "nome": "Banco J. Safra S.A."},
    {"codigo_bacen": "748", "nome": "Banco Cooperativo Sicredi S.A."},
    {"codigo_bacen": "756", "nome": "Banco Cooperativo do Brasil S.A. (SICOOB)"},
    {"codigo_bacen": "041", "nome": "Banco do Estado do Rio Grande do Sul S.A. (Banrisul)"},
    {"codigo_bacen": "389", "nome": "Banco Mercantil do Brasil S.A."},
    {"codigo_bacen": "422", "nome": "Banco Safra S.A."}
]

def seed_bancos():
    with Session(engine) as session:
        for b_data in bancos_list:
            # Verifica se o banco já existe para evitar duplicações
            existente = session.exec(select(Banco).where(Banco.codigo_bacen == b_data["codigo_bacen"])).first()
            if not existente:
                novo_banco = Banco(codigo_bacen=b_data["codigo_bacen"], nome=b_data["nome"])
                session.add(novo_banco)
                print(f"Banco adicionado: {b_data['codigo_bacen']} - {b_data['nome']}")
            else:
                print(f"Ignorado (Já existe): {b_data['codigo_bacen']} - {b_data['nome']}")
        
        session.commit()
        print("Finalizado!")

if __name__ == "__main__":
    seed_bancos()
