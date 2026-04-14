from app.models.database import engine, Empresa, User, UsuarioEmpresa, UserRole, RegimeTributario, InviteStatus
from sqlmodel import Session, select
from uuid import UUID, uuid4
import os
from dotenv import load_dotenv

load_dotenv()

def seed_test_data():
    with Session(engine) as db:
        # 1. Gerar ou Buscar Empresa de Teste
        empresa_email = "aws311274@gmail.com"
        stmt_empresa = select(Empresa).where(Empresa.razao_social == "Empresa de Teste Antigravity")
        empresa = db.exec(stmt_empresa).first()
        
        if not empresa:
            empresa = Empresa(
                id=uuid4(),
                razao_social="Empresa de Teste Antigravity",
                nome_fantasia="Antigravity ERP",
                cnpj="12345678000199",
                regime_tributario=RegimeTributario.SIMPLES_NACIONAL,
                cep="01001000",
                logradouro="Praça da Sé",
                numero="1",
                bairro="Sé",
                cidade="São Paulo",
                uf="SP",
                codigo_municipio_ibge="3550308",
                configuracoes={}
            )
            db.add(empresa)
            db.commit()
            db.refresh(empresa)
            print(f"Empresa criada com ID: {empresa.id}")
        else:
            print(f"Empresa já existe: {empresa.id}")

        # 2. Criar Vínculo para o Usuário
        # Como o UUID do Supabase é gerado no Auth, o usuário deve primeiro logar ou 
        # o administrador deve fornecer o UID.
        # Vou criar uma entrada pendente ou um usuário mock com ID temporário 
        # que será sobreposto no primeiro login/conexão real se necessário.
        
        user_email = "aws311274@gmail.com"
        # NOTA: O ID abaixo deve ser substituído pelo UID real do Supabase Auth para funcionar o RLS/Filtro
        # Se você já tem o UID, coloque-o aqui. Caso contrário, o sistema criará no primeiro login.
        
        stmt_user = select(User).where(User.email == user_email)
        user = db.exec(stmt_user).first()
        
        if not user:
            print(f"Aviso: Usuário {user_email} ainda não existe no DB local.")
            print("Ele será criado automaticamente ao finalizar o registro ou no primeiro login real.")
        else:
            # Garantir vínculo
            stmt_link = select(UsuarioEmpresa).where(
                UsuarioEmpresa.usuario_id == user.id,
                UsuarioEmpresa.empresa_id == empresa.id
            )
            link = db.exec(stmt_link).first()
            if not link:
                link = UsuarioEmpresa(
                    usuario_id=user.id,
                    empresa_id=empresa.id,
                    role=UserRole.ADMIN
                )
                db.add(link)
                db.commit()
                print(f"Vínculo ADMIN criado para {user_email} na empresa {empresa.razao_social}")
            else:
                print(f"Vínculo já existe para {user_email}")

if __name__ == "__main__":
    seed_test_data()
