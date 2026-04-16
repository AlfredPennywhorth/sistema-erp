from fastapi import Header, HTTPException, Depends, Request, status
from sqlmodel import Session, select
from uuid import UUID
from typing import List, Optional

from app.models.database import engine, UsuarioEmpresa, UserRole, User


def get_session():
    with Session(engine) as session:
        yield session


async def get_current_tenant_id(x_tenant_id: Optional[str] = Header(None)) -> UUID:
    """
    Extrai o ID da empresa do cabeçalho X-Tenant-ID.
    """
    if not x_tenant_id or x_tenant_id in ("null", "undefined"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header X-Tenant-ID ausente ou inválido. Selecione uma empresa.",
        )
    try:
        return UUID(x_tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Header X-Tenant-ID '{x_tenant_id}' não é um UUID válido.",
        )


async def get_current_user_id(request: Request) -> Optional[UUID]:
    """
    Extrai o ID do usuário do estado da requisição (request.state.user_id),
    que é definido exclusivamente pelo middleware após validação do JWT Supabase.
    Nunca lê o header X-User-ID diretamente — a identidade nunca é aceita de
    um header controlado pelo cliente em rotas protegidas.
    """
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        return None
    try:
        return UUID(str(user_id))
    except ValueError:
        return None


class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        request: Request,
        tenant_id: UUID = Depends(get_current_tenant_id),
        db: Session = Depends(get_session),
    ):
        """
        Verifica se o usuário autenticado possui a role necessária para o tenant.
        A identidade do usuário vem exclusivamente do JWT validado pelo middleware —
        DEV_MODE não desabilita esta verificação.
        """
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Autenticação obrigatória.",
            )

        try:
            user_uuid = UUID(str(user_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Identidade do usuário inválida.",
            )

        stmt = select(UsuarioEmpresa).where(
            UsuarioEmpresa.usuario_id == user_uuid,
            UsuarioEmpresa.empresa_id == tenant_id,
        )
        result = db.exec(stmt).one_or_none()

        if not result or result.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não possui as permissões necessárias para esta empresa.",
            )

        return True
