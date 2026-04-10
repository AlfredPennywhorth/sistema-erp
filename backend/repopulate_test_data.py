import os
import sys
import uuid
from datetime import datetime, timedelta
from sqlmodel import Session, SQLModel, create_engine, select, delete

# Adicionar o diretório pai ao path para importar os modelos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.models.database import Empresa, User, Invite, UserRole, InviteStatus, UsuarioEmpresa, RegimeTributario, engine

def setup_clean_db():
    print("Limpando e populando banco de dados com IDs estáveis e campos obrigatórios...")
    
    # Criar tabelas se não existirem
    SQLModel.metadata.create_all(engine)
    
    # IDs FIXOS para evitar quebras entre resets
    ID_EMPRESA = uuid.UUID("e2663cf3-800d-4d13-8173-4190eef63524")
    ID_USER_ADMIN = uuid.UUID("fe5d0c81-062c-44b1-942d-2c5a224ba6ca")
    EMAIL_USER = "aws311274@gmail.com"

    with Session(engine) as session:
        # 1. Limpar dados existentes
        session.exec(delete(UsuarioEmpresa))
        session.exec(delete(Invite))
        session.exec(delete(User))
        session.exec(delete(Empresa))
        session.commit()

        # 2. Criar Empresa (Com todos os campos obrigatórios)
        empresa = Empresa(
            id=ID_EMPRESA,
            razao_social="SOUZA NEXUS ENTERPRISE LTDA",
            nome_fantasia="SOUZA NEXUS",
            cnpj="12345678000199",
            cnae_principal="6201501", # Desenvolvimento de software
            regime_tributario=RegimeTributario.SIMPLES_NACIONAL,
            cep="01001000",
            logradouro="Praça da Sé",
            numero="100",
            bairro="Centro",
            cidade="São Paulo",
            uf="SP",
            codigo_municipio_ibge="3550308",
            is_active=True
        )
        session.add(empresa)
        
        # 3. Criar Usuários (já ativos e vinculados)
        user_admin = User(
            id=ID_USER_ADMIN,
            email=EMAIL_USER,
            nome="Administrador Souza Nexus",
            is_active=True
        )
        session.add(user_admin)
        
        # 4. Criar Vínculo Usuário-Empresa
        vinculo = UsuarioEmpresa(
            usuario_id=user_admin.id,
            empresa_id=empresa.id,
            role=UserRole.ADMIN,
            is_active=True
        )
        session.add(vinculo)
        
        # 5. Criar um Convite de teste para um colega
        token_convite = "04d2683b-149d-4e2e-be58-397e38769f6f"
        invite = Invite(
            empresa_id=empresa.id,
            email="membro.equipe@nexus.com",
            role=UserRole.OPERATOR,
            token=token_convite,
            expira_em=datetime.now() + timedelta(days=7),
            status=InviteStatus.PENDING
        )
        session.add(invite)
        
        session.commit()
        
        print(f"\n==================================================")
        print(f"SOUZA NEXUS: PRONTA PARA USO")
        print(f"==================================================")
        print(f"Usuário Admin: {EMAIL_USER}")
        print(f"Empresa ID: {ID_EMPRESA}")
        print(f"Token de Convite (Extra): {token_convite}")
        print(f"==================================================\n")

if __name__ == "__main__":
    setup_clean_db()
