from fastapi import Header, HTTPException, Depends, status
from sqlmodel import Session, select
from uuid import UUID
from typing import List, Optional
import os

from app.models.database import engine, UsuarioEmpresa, UserRole, User

def get_session():
    with Session(engine) as session:
        yield session

async def get_current_tenant_id(x_tenant_id: Optional[str] = Header(None)) -> UUID:
    """
    Extrai o ID da empresa do cabeçalho da requisição.
    """
    if not x_tenant_id or x_tenant_id == "null" or x_tenant_id == "undefined":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header X-Tenant-ID ausente ou inválido. Selecione uma empresa."
        )
    
    try:
        return UUID(x_tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Header X-Tenant-ID '{x_tenant_id}' não é um UUID válido."
        )

async def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> Optional[UUID]:
    """
    Extrai o ID do usuário do cabeçalho da requisição (X-User-ID).
    Em produção, isso viria do token JWT/Supabase.
    """
    if not x_user_id or x_user_id == "null" or x_user_id == "undefined":
        return None
    
    try:
        return UUID(x_user_id)
    except ValueError:
        return None

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(
        self, 
        tenant_id: UUID = Depends(get_current_tenant_id),
        user_id: Optional[UUID] = Depends(get_current_user_id), 
        db: Session = Depends(get_session)
    ):
        """
        Verifica se o usuário tem permissão para acessar o tenant com a role necessária.
        """
        if not user_id:
            # Em modo mock/dev, pode ser que o X-User-ID não venha
            dev_mode = os.getenv("DEV_MODE", "false").lower() in ("1", "true", "yes")
            if dev_mode:
                return True
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Autenticação obrigatória."
            )

        # Consulta ao banco para verificar vínculo N:N
        stmt = select(UsuarioEmpresa).where(
            UsuarioEmpresa.usuario_id == user_id,
            UsuarioEmpresa.empresa_id == tenant_id
        )
        result = db.exec(stmt).one_or_none()
        
        if not result or result.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não possui as permissões necessárias para esta empresa."
            )
        
        return True
