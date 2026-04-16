from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select, func
from uuid import UUID
from typing import List, Optional
from datetime import datetime

from app.models.database import (
    engine, Empresa, UsuarioEmpresa, UserRole, 
    HonorariosContador, TrilhaAuditoriaContador, SegmentoMercado,
    StatusPagamento
)
from app.core.auth import get_session

router = APIRouter()

@router.get("/empresas", response_model=List[Empresa])
async def list_vinculos_contador(
    request: Request,
    db: Session = Depends(get_session)
):
    """
    Retorna a lista de empresas vinculadas ao contador ativo.
    """
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou ausente.")
    try:
        user_uuid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identidade do usuário inválida.")

    # Busca vínculos N:N onde o usuário é Auditor/Contador
    stmt = select(Empresa).join(UsuarioEmpresa).where(
        UsuarioEmpresa.usuario_id == user_uuid,
        UsuarioEmpresa.role == UserRole.CONTADOR,
        UsuarioEmpresa.ativo == True
    )
    return db.exec(stmt).all()

@router.post("/switch-context")
async def switch_tenant_context(
    request: Request,
    empresa_id: UUID,
    db: Session = Depends(get_session)
):
    """
    Registra a alternância de contexto na trilha de auditoria.
    """
    user_id = getattr(request.state, "user_id", None)
    try:
        user_uuid = UUID(str(user_id)) if user_id else None
    except ValueError:
        user_uuid = None

    # Validar se o contador tem acesso a esta empresa
    check = db.exec(select(UsuarioEmpresa).where(
        UsuarioEmpresa.usuario_id == user_uuid,
        UsuarioEmpresa.empresa_id == empresa_id,
        UsuarioEmpresa.role == UserRole.CONTADOR
    )).first()

    if not check:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar esta empresa.")

    # Registrar log de auditoria
    log = TrilhaAuditoriaContador(
        usuario_id=user_uuid,
        empresa_id=empresa_id,
        acao="ALTERNANCIA_CONTEXTO",
        detalhes={"timestamp": datetime.now().isoformat()}
    )
    db.add(log)
    db.commit()
    
    return {"status": "success", "message": f"Contexto alterado para empresa {empresa_id}"}

@router.get("/dashboard-metrics")
async def get_dashboard_metrics(
    request: Request,
    db: Session = Depends(get_session)
):
    """
    Retorna métricas agregadas das empresas vinculadas.
    """
    user_id = getattr(request.state, "user_id", None)
    try:
        user_uuid = UUID(str(user_id)) if user_id else None
    except ValueError:
        user_uuid = None

    # 1. Pegar IDs das empresas permitidas
    vinculos = db.exec(select(UsuarioEmpresa.empresa_id).where(
        UsuarioEmpresa.usuario_id == user_uuid,
        UsuarioEmpresa.role == UserRole.CONTADOR
    )).all()
    
    if not vinculos:
        return {"fiscal_distribution": [], "segment_distribution": []}

    # 2. Agregação por Regime Tributário
    fiscal_stats = db.exec(
        select(Empresa.classificacao_fiscal, func.count(Empresa.id))
        .where(Empresa.id.in_(vinculos))
        .group_by(Empresa.classificacao_fiscal)
    ).all()
    
    # 3. Agregação por Segmento de Mercado
    segment_stats = db.exec(
        select(SegmentoMercado.nome, func.count(Empresa.id))
        .join(Empresa, Empresa.segmento_mercado_id == SegmentoMercado.id)
        .where(Empresa.id.in_(vinculos))
        .group_by(SegmentoMercado.nome)
    ).all()

    return {
        "fiscal_distribution": [{"label": item[0], "value": item[1]} for item in fiscal_stats if item[0]],
        "segment_distribution": [{"label": item[0], "value": item[1]} for item in segment_stats]
    }

@router.get("/honorarios", response_model=List[HonorariosContador])
async def list_honorarios(
    request: Request,
    status_filtro: Optional[StatusPagamento] = None,
    db: Session = Depends(get_session)
):
    user_id = getattr(request.state, "user_id", None)
    try:
        user_uuid = UUID(str(user_id)) if user_id else None
    except ValueError:
        user_uuid = None
    stmt = select(HonorariosContador).where(HonorariosContador.usuario_id == user_uuid)
    if status_filtro:
        stmt = stmt.where(HonorariosContador.status_pagamento == status_filtro)
    
    return db.exec(stmt).all()

@router.post("/honorarios", response_model=HonorariosContador)
async def create_honorario(
    honorario: HonorariosContador,
    request: Request,
    db: Session = Depends(get_session)
):
    user_id = getattr(request.state, "user_id", None)
    try:
        user_uuid = UUID(str(user_id)) if user_id else None
    except ValueError:
        user_uuid = None
    honorario.usuario_id = user_uuid
    db.add(honorario)
    db.commit()
    db.refresh(honorario)
    return honorario
