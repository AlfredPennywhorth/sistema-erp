import uuid
from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.models.database import engine, Empresa, Invite, UserRole, InviteStatus

def generate_invite():
    with Session(engine) as session:
        # 1. Buscar a primeira empresa disponível
        empresa = session.exec(select(Empresa)).first()
        if not empresa:
            print("❌ Nenhuma empresa encontrada no banco de dados. Crie uma empresa primeiro.")
            return

        # 2. Dados do convite
        test_email = "convidado.teste@exemplo.com"
        token = str(uuid.uuid4())
        
        # 3. Criar registro
        invite = Invite(
            empresa_id=empresa.id,
            email=test_email,
            role=UserRole.OPERATOR,
            token=token,
            expira_em=datetime.utcnow() + timedelta(days=2),
            status=InviteStatus.PENDING
        )
        
        session.add(invite)
        session.commit()
        
        print(f"✅ Convite gerado com sucesso!")
        print(f"Empresa: {empresa.razao_social}")
        print(f"E-mail: {test_email}")
        print(f"Token: {token}")
        print(f"URL de Teste: http://localhost:5173/finalizar-registro?token={token}")

if __name__ == "__main__":
    generate_invite()
