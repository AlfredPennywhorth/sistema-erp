from fastapi import APIRouter, Depends, HTTPException, status, Header, BackgroundTasks
from sqlmodel import Session, select
from sqlalchemy import text as sa_text
from uuid import UUID, uuid4
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
import os
import time
import httpx

from app.models.database import engine, Empresa, UsuarioEmpresa, User, Invite, UserRole, InviteStatus, LogAuditoria
from app.core.auth import RoleChecker, get_current_tenant_id, get_session
from app.services.resend_service import ResendService

# Configurações do Supabase enviadas via variáveis de ambiente
supabase_url = os.getenv("SUPABASE_URL")
supabase_admin_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def confirm_supabase_email_direct(user_id: str):
    """
    Confirma o e-mail do usuário no Supabase Auth via API REST direta (Admin).
    Usado para evitar dependência do SDK 'supabase' que falha em alguns ambientes.
    """
    if not supabase_url or not supabase_admin_key:
        print("--- [AUTH ADMIN] Aviso: Chaves do Supabase não configuradas para auto-confirmação ---")
        return False
    
    url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": supabase_admin_key,
        "Authorization": f"Bearer {supabase_admin_key}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(url, headers=headers, json={"email_confirm": True})
            if response.status_code in [200, 201]:
                print(f"--- [AUTH ADMIN] E-mail do usuário {user_id} confirmado via API REST ---")
                return True
            else:
                print(f"--- [AUTH ADMIN] Erro na API Supabase: {response.status_code} - {response.text} ---")
                return False
    except Exception as e:
        print(f"--- [AUTH ADMIN] Exceção na chamada REST: {str(e)} ---")
        return False

router = APIRouter()

# Dependency para acesso ADMIN
admin_only = Depends(RoleChecker([UserRole.ADMIN]))

@router.get("/members", response_model=Dict[str, Any])
def list_team_members(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session)
):
    start_time = time.time()
    print(f">>> [TEAM] list_team_members Iniciando em {start_time}")
    try:
        print(f"[DEBUG BACKEND] Listando membros para o Tenant ID: {tenant_id}")
        print(f"[DEBUG TEAM] Tenant ID: {tenant_id}")
        """
        Lista os membros da equipe e os convites pendentes da empresa atual.
        """
        # 1. Buscar vínculos da empresa
        vinc_stmt = select(UsuarioEmpresa).where(UsuarioEmpresa.empresa_id == tenant_id)
        vinculos = db.exec(vinc_stmt).all()
        
        if not vinculos:
            active_results = []
        else:
            # 2. Buscar usuários vinculados
            user_ids = [v.usuario_id for v in vinculos]
            user_stmt = select(User).where(User.id.in_(user_ids))
            usuarios = db.exec(user_stmt).all()
            
            # Mapear para facilitar o JOIN manual
            user_map = {u.id: u for u in usuarios}
            active_results = [(user_map.get(v.usuario_id), v) for v in vinculos if user_map.get(v.usuario_id)]

        team_list = [
            {
                "id": str(user.id),
                "name": user.nome or "Usuário sem nome",
                "email": user.email,
                "role": ue.role,
                "status": "ATIVO",
                "avatar": f"https://ui-avatars.com/api/?name={user.nome or 'User'}&background=005681&color=fff",
                "joinedAt": "N/A"
            }
            for user, ue in active_results
        ]

        # 2. Buscar convites pendentes
        stmt_invites = select(Invite).where(
            Invite.empresa_id == tenant_id,
            Invite.status == InviteStatus.PENDING
        )
        pending_invites = db.exec(stmt_invites).all()

        for invite in pending_invites:
            team_list.append({
                "id": str(invite.id),
                "name": "Convidado",
                "email": invite.email,
                "role": invite.role,
                "status": "PENDENTE",
                "token": invite.token,
                "avatar": f"https://ui-avatars.com/api/?name=C&background=f1f5f9&color=64748b",
                "joinedAt": None
            })
        
        # 3. Buscar nome da empresa
        empresa = db.get(Empresa, tenant_id)
        company_name = empresa.razao_social if empresa else "Sua Empresa"
        
        return {
            "company_name": company_name,
            "members": team_list
        }
    except Exception as e:
        print(f"[CRITICAL ERROR] GET /members falhou: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno ao listar membros da equipe.")

@router.post("/invite", status_code=status.HTTP_201_CREATED)
def invite_member(
    invite_data: dict, # email, role
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session)
    # auth: bool = admin_only
):
    """
    Gera um token de convite e envia o e-mail (ou apenas retorna o link em dev).
    """
    try:
        email = invite_data.get("email")
        role = invite_data.get("role", UserRole.OPERADOR)

        if not email:
            raise HTTPException(status_code=400, detail="E-mail é obrigatório.")

        print(f"[DEBUG] Iniciando convite para {email} no Tenant {tenant_id}")

        # 1. Gerar token único
        token = str(uuid4())
        
        # 2. Criar registro de convite
        db_invite = Invite(
            empresa_id=tenant_id,
            email=email,
            role=role,
            token=token,
            expira_em=datetime.now() + timedelta(days=2),
            status=InviteStatus.PENDING
        )
        db.add(db_invite)
        db.commit()

        # 3. Gerar Link
        invite_link = f"http://localhost:5173/finalizar-registro?token={token}"
        
        # Buscar nome da empresa para o e-mail
        empresa = db.get(Empresa, tenant_id)
        company_name = empresa.razao_social if empresa else "Sua Empresa"
        
        # 4. Enviar e-mail ou Bypass em Dev
        env = os.getenv("ENVIRONMENT", "production")
        dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"
        email_status = "simulated"
        
        if env == "development" or dev_mode:
            print("\n" + "="*50)
            print(f"--- [MODO DESENVOLVIMENTO] CONVITE GERADO ---")
            print(f"Destinatário: {email}")
            print(f"Empresa: {company_name}")
            print(f"LINK DE ACESSO: {invite_link}")
            print("="*50 + "\n")
            email_status = "bypassed_in_dev"
        else:
            try:
                email_status = ResendService.send_invite_email(email, company_name, invite_link)
            except Exception as e:
                print(f"ALERTA: Falha no envio de e-mail real: {str(e)}")
                email_status = f"error: {str(e)}"

        return {
            "message": "Convite processado com sucesso!",
            "token": token,
            "invite_link": invite_link if (env == "development" or dev_mode) else None,
            "email_status": email_status
        }

    except Exception as e:
        print("!!! [CRITICAL ERROR] Falha no endpoint /invite !!!")
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500, 
            detail=f"Erro interno no servidor ao processar convite: {str(e)}"
        )

@router.post("/resend-invite/{invite_id}")
def resend_invite(
    invite_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session)
):
    """
    Reenvia o e-mail de convite e retorna o link atualizado.
    """
    invite = db.get(Invite, invite_id)
    if not invite or invite.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")
    
    # Atualizar expiração
    invite.expira_em = datetime.now() + timedelta(days=2)
    db.commit()

    invite_link = f"http://localhost:5173/finalizar-registro?token={invite.token}"
    
    empresa = db.get(Empresa, tenant_id)
    company_name = empresa.razao_social if empresa else "Sua Empresa"
    
    ResendService.send_invite_email(invite.email, company_name, invite_link)

    return {
        "message": "Convite reenviado com sucesso!",
        "token": invite.token,
        "invite_link": invite_link
    }

@router.patch("/members/{member_id}/role")
def update_member_role(
    member_id: str,
    role_data: dict,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session)
):
    """
    Altera a função (role) de um membro ativo ou de um convite pendente.
    """
    new_role = role_data.get("role")
    if not new_role or new_role not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail="Função inválida.")

    # 1. Tentar como membro ativo
    try:
        member_uuid = UUID(member_id)
        stmt = select(UsuarioEmpresa).where(
            UsuarioEmpresa.usuario_id == member_uuid,
            UsuarioEmpresa.empresa_id == tenant_id
        )
        ue = db.exec(stmt).first()
        if ue:
            ue.role = new_role
            db.commit()
            return {"message": "Função do membro atualizada."}
    except ValueError:
        pass

    # 2. Tentar como convite pendente
    try:
        invite_uuid = UUID(member_id)
        invite = db.get(Invite, invite_uuid)
        if invite and invite.empresa_id == tenant_id:
            invite.role = new_role
            db.commit()
            return {"message": "Função do convite atualizada."}
    except ValueError:
        pass

    raise HTTPException(status_code=404, detail="Membro ou convite não encontrado.")

@router.delete("/members/{member_id}")
def remove_member(
    member_id: str,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session)
):
    """
    Remove um membro da empresa ou cancela um convite pendente.
    """
    # 1. Tentar remover membro ativo
    try:
        member_uuid = UUID(member_id)
        stmt = select(UsuarioEmpresa).where(
            UsuarioEmpresa.usuario_id == member_uuid,
            UsuarioEmpresa.empresa_id == tenant_id
        )
        ue = db.exec(stmt).first()
        if ue:
            # Proteção: Impedir a remoção do último ADMIN
            if ue.role == UserRole.ADMIN:
                admin_count_stmt = select(UsuarioEmpresa).where(
                    UsuarioEmpresa.empresa_id == tenant_id,
                    UsuarioEmpresa.role == UserRole.ADMIN
                )
                admin_count = len(db.exec(admin_count_stmt).all())
                if admin_count <= 1:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, 
                        detail="Não é possível remover o único administrador da empresa."
                    )
            
            db.delete(ue)
            db.commit()
            return {"message": "Membro removido com sucesso."}
    except ValueError:
        pass

    # 2. Tentar remover convite
    try:
        invite_uuid = UUID(member_id)
        invite = db.get(Invite, invite_uuid)
        if invite and invite.empresa_id == tenant_id:
            db.delete(invite)
            db.commit()
            return {"message": "Convite removido com sucesso."}
    except ValueError:
        pass

    raise HTTPException(status_code=404, detail="Membro ou convite não encontrado.")

@router.get("/invite-details/{token}")
def get_invite_details(token: str, db: Session = Depends(get_session)):
    """
    Retorna os detalhes de um convite para a tela de finalização.
    """
    stmt = select(Invite).where(Invite.token == token)
    invite = db.exec(stmt).first()

    if not invite:
        raise HTTPException(status_code=404, detail="[ERROR_CODE:INVITE_NOT_FOUND] Convite não encontrado. Verifique se o link está completo.")
    
    if invite.status != InviteStatus.PENDING:
        raise HTTPException(status_code=400, detail="[ERROR_CODE:INVITE_ALREADY_USED] Este convite já foi utilizado ou cancelado.")
    
    # Verificação de expiração mais resiliente
    now = datetime.now()
    if invite.expira_em < now - timedelta(minutes=60): # Tolerância de 1 hora
        raise HTTPException(status_code=400, detail="[ERROR_CODE:INVITE_EXPIRED] Este convite expirou. Solicite um novo ao administrador.")

    empresa = db.get(Empresa, invite.empresa_id)
    
    return {
        "email": invite.email,
        "role": invite.role,
        "company_id": str(invite.empresa_id),
        "company_name": empresa.razao_social if empresa else "Sua Empresa"
    }

@router.post("/finalize-registration")
async def finalize_registration(
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session)
):
    """
    Finaliza o cadastro do usuário convidado após autenticação no Supabase.

    Estratégia robusta (sem DELETE):
    - Se há usuário antigo com o mesmo e-mail mas UUID diferente, migra o UUID
      via SQL raw (atualiza filhos primeiro, depois o pai) para preservar
      todos os vínculos FK sem ForeignKeyViolation.
    - Se o UUID já existe, apenas atualiza o nome.
    - Se não há conflito, cria o usuário novo normalmente.
    """
    token = data.get("token")
    user_id = data.get("usuario_id")
    nome = data.get("nome")

    print(f">>> [TEAM] finalize_registration para user={user_id}, token={token[:8] if token else None}...")

    try:
        # 1. Validações básicas
        if not all([token, nome]):
            raise HTTPException(status_code=400, detail="Nome e token são obrigatórios.")

        if not user_id:
            raise HTTPException(status_code=400, detail="ID de usuário do Supabase não fornecido.")

        # 2. Validar convite
        invite = db.exec(select(Invite).where(Invite.token == token)).first()
        if not invite or invite.status != InviteStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail="[ERROR_CODE:INVITE_ALREADY_USED] Convite inválido ou já utilizado."
            )

        user_uuid = UUID(user_id)

        # 3. Processar usuário — 3 casos possíveis:
        user = db.get(User, user_uuid)

        if user:
            # CASO A: UUID já existe → atualiza só o nome (idempotente)
            print(f"[FINALIZE] CASO A: UUID {user_uuid} já existe. Atualizando nome.")
            user.nome = nome
            user.is_active = True
            db.add(user)
            db.flush()

        else:
            old_user = db.exec(select(User).where(User.email == invite.email)).first()

            if old_user:
                # CASO B: Email existe com UUID diferente → migrar UUID via SQL raw
                old_id = str(old_user.id)
                new_id = str(user_uuid)
                print(f"[FINALIZE] CASO B: Migrando UUID {old_id} → {new_id}")

                # Atualiza tabelas filhas que referenciam usuarios.id
                for child_table in ["usuario_empresas", "honorarios_contador", "trilha_auditoria_contador"]:
                    try:
                        db.exec(sa_text(
                            f"UPDATE {child_table} SET usuario_id = :new_id WHERE usuario_id = :old_id"
                        ).bindparams(new_id=new_id, old_id=old_id))
                    except Exception as te:
                        # Tabela pode não existir ainda — ignora silenciosamente
                        print(f"[FINALIZE] Tabela {child_table}: {te} (ignorado)")

                db.flush()

                # Agora atualiza o pai (sem FK block)
                db.exec(sa_text(
                    "UPDATE usuarios SET id = :new_id, nome = :nome, is_active = true WHERE id = :old_id"
                ).bindparams(new_id=new_id, nome=nome, old_id=old_id))
                db.flush()

                # Recarrega o cache da sessão ORM
                db.expire_all()
                user = db.get(User, user_uuid)
                if not user:
                    raise HTTPException(status_code=500, detail="Falha ao recuperar usuário após migração de UUID.")
            else:
                # CASO C: Sem conflito → criar usuário novo
                print(f"[FINALIZE] CASO C: Criando novo usuário {user_uuid}")
                user = User(
                    id=user_uuid,
                    email=invite.email,
                    nome=nome,
                    is_active=True
                )
                db.add(user)
                db.flush()

        # 4. Criar vínculo com a empresa (idempotente)
        stmt_check = select(UsuarioEmpresa).where(
            UsuarioEmpresa.usuario_id == user_uuid,
            UsuarioEmpresa.empresa_id == invite.empresa_id
        )
        if not db.exec(stmt_check).first():
            db.add(UsuarioEmpresa(
                usuario_id=user_uuid,
                empresa_id=invite.empresa_id,
                role=invite.role
            ))

        # 5. Marcar convite como aceito
        invite.status = InviteStatus.ACCEPTED
        invite.aceito_em = datetime.now()
        db.add(invite)

        # 6. Commit final
        db.commit()
        db.refresh(user)

        # 7. Auto-confirmação de e-mail em background (apenas em DEV)
        dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"
        if dev_mode:
            print(f"[AUTH ADMIN] Agendando confirmação de e-mail para: {invite.email}")
            background_tasks.add_task(confirm_supabase_email_direct, str(user_uuid))

        print(f"[OK] Registro finalizado: {nome} (UUID: {user_uuid})")
        return {"message": "Cadastro finalizado com sucesso! Agora você pode fazer login."}

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

@router.get("/audit", response_model=List[LogAuditoria])
def list_audit_logs(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session)
):
    """
    Retorna os logs de auditoria da empresa.
    """
    stmt = (
        select(LogAuditoria)
        .where(LogAuditoria.empresa_id == tenant_id)
        .order_by(LogAuditoria.criado_em.desc())
        .limit(50)
    )
    return db.exec(stmt).all()
