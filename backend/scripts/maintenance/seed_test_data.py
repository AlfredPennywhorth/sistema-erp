from sqlmodel import Session, create_engine, select
from app.models.database import (
    Empresa, User, UsuarioEmpresa, UserRole, RegimeTributario, Invite, InviteStatus
)
from uuid import uuid4, UUID
from datetime import datetime, timedelta
import os

# Usar o mesmo engine do app
DATABASE_URL = "sqlite:///./erp.db"
engine = create_engine(DATABASE_URL)

def seed():
    with Session(engine) as session:
        print("Iniciando carga de dados de teste...")

        # --- EMPRESA A ---
        empresa_a = Empresa(
            id=uuid4(),
            razao_social="Nexus Tech Enterprise",
            cnpj="11111111111111",
            regime_tributario=RegimeTributario.SIMPLES_NACIONAL,
            cnae_principal="6201501",
            cep="12345678",
            logradouro="Rua da Tecnologia",
            numero="100",
            bairro="Centro",
            cidade="Sao Paulo",
            uf="SP",
            codigo_municipio_ibge="3550308"
        )
        session.add(empresa_a)

        # --- EMPRESA B ---
        empresa_b = Empresa(
            id=uuid4(),
            razao_social="Souza Consulting Services",
            cnpj="22222222222222",
            regime_tributario=RegimeTributario.LUCRO_PRESUMIDO,
            cnae_principal="7020401",
            cep="87654321",
            logradouro="Avenida dos Consultores",
            numero="500",
            bairro="Vila Nova",
            cidade="Rio de Janeiro",
            uf="RJ",
            codigo_municipio_ibge="3304557"
        )
        session.add(empresa_b)
        
        session.flush()

        # --- USUARIOS ---
        # IDs fictícios para simular IDs do Supabase
        users_data = [
            {"email": "admin.tech@example.com", "nome": "Admin Nexus", "role": UserRole.ADMIN, "empresa": empresa_a},
            {"email": "op.tech@example.com", "nome": "Operador Nexus", "role": UserRole.OPERATOR, "empresa": empresa_a},
            {"email": "admin.souza@example.com", "nome": "Admin Souza", "role": UserRole.ADMIN, "empresa": empresa_b},
            {"email": "op.souza@example.com", "nome": "Operador Souza", "role": UserRole.OPERATOR, "empresa": empresa_b},
        ]

        for u_info in users_data:
            user = User(
                id=uuid4(),
                email=u_info["email"],
                nome=u_info["nome"]
            )
            session.add(user)
            session.flush()

            # Vinculo
            ue = UsuarioEmpresa(
                usuario_id=user.id,
                empresa_id=u_info["empresa"].id,
                role=u_info["role"]
            )
            session.add(ue)

        session.commit()
        print("Dados de teste carregados com sucesso!")
        print(f"Empresa A: {empresa_a.id}")
        print(f"Empresa B: {empresa_b.id}")

if __name__ == "__main__":
    seed()
