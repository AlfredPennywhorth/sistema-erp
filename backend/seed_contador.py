from sqlmodel import Session, select, SQLModel
from app.models.database import (
    engine, Empresa, User, UsuarioEmpresa, UserRole, 
    SegmentoMercado, RegimeTributario, HonorariosContador,
    StatusPagamento, create_db_and_tables
)
from uuid import UUID, uuid4
from datetime import date, timedelta
import os

import traceback

# Garantir que o banco de dados e as tabelas existam
def ensure_tables():
    print("Verificando/Criando tabelas...")
    for name, table in SQLModel.metadata.tables.items():
        try:
            table.create(engine, checkfirst=True)
        except Exception as e:
            print(f"Erro ao criar tabela {name}: {e}")

def seed_contador():
    try:
        # Cria as tabelas individualmente (mais robusto no Windows/SQLite)
        ensure_tables()
        
        with Session(engine) as session:
            # 1. Segmentos de Mercado
            print("Semeando Segmentos de Mercado...")
            segments = ["Tecnologia", "Varejo", "Serviços Médicos", "Indústria", "Educação"]
            for s_name in segments:
                existing = session.exec(select(SegmentoMercado).where(SegmentoMercado.nome == s_name)).first()
                if not existing:
                    session.add(SegmentoMercado(nome=s_name))
            session.commit()
            
            # 2. Usuário Contador (Mock)
            print("Semeando Contador...")
            contador_id = UUID("00000000-0000-0000-0000-000000000001") # ID estático para testes
            contador = session.get(User, contador_id)
            if not contador:
                contador = User(
                    id=contador_id,
                    email="contador@exemplo.com",
                    nome="Dr. Roberto Contador",
                    is_active=True
                )
                session.add(contador)
                session.commit()

            # 3. Empresas Clientes
            print("Semeando Empresas Clientes...")
            empresas_data = [
                {"nome": "Tech Soluções LTDA", "cnpj": "11111111000111", "regime": RegimeTributario.SIMPLES_NACIONAL, "segmento": "Tecnologia", "fat": 500000},
                {"nome": "Supermercado Central", "cnpj": "22222222000122", "regime": RegimeTributario.LUCRO_PRESUMIDO, "segmento": "Varejo", "fat": 2500000},
                {"nome": "Clínica Vida", "cnpj": "33333333000133", "regime": RegimeTributario.LUCRO_REAL, "segmento": "Serviços Médicos", "fat": 8000000},
                {"nome": "Indústria Metalúrgica", "cnpj": "44444444000144", "regime": RegimeTributario.LUCRO_REAL, "segmento": "Indústria", "fat": 15000000},
            ]

            for emp in empresas_data:
                existing_emp = session.exec(select(Empresa).where(Empresa.cnpj == emp["cnpj"])).first()
                if not existing_emp:
                    segment = session.exec(select(SegmentoMercado).where(SegmentoMercado.nome == emp["segmento"])).first()
                    new_emp = Empresa(
                        razao_social=emp["nome"],
                        nome_fantasia=emp["nome"],
                        cnpj=emp["cnpj"],
                        regime_tributario=emp["regime"],
                        classificacao_fiscal=emp["regime"],
                        faturamento_anual=emp["fat"],
                        segmento_mercado_id=segment.id if segment else None,
                        # Campos obrigatórios do mixin/v1
                        cep="00000000",
                        logradouro="Rua Teste",
                        numero="123",
                        bairro="Centro",
                        cidade="São Paulo",
                        uf="SP",
                        codigo_municipio_ibge="3550308"
                    )
                    session.add(new_emp)
                    session.flush() # Para pegar o ID

                    # Criar vínculo com o contador
                    session.add(UsuarioEmpresa(
                        usuario_id=contador.id,
                        empresa_id=new_emp.id,
                        role=UserRole.AUDITOR_CONTADOR,
                        ativo=True
                    ))
                    
                    # Gerar honorário fictício
                    session.add(HonorariosContador(
                        usuario_id=contador.id,
                        empresa_id=new_emp.id,
                        valor=1500.00 if emp["regime"] == RegimeTributario.SIMPLES_NACIONAL else 3500.00,
                        data_vencimento=date.today() + timedelta(days=15),
                        status_pagamento=StatusPagamento.PENDENTE
                    ))

            session.commit()
            print("Seed concluído com sucesso!")
    except Exception as e:
        print(f"Erro no seed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    seed_contador()
