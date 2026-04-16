from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select, func
from uuid import UUID
from typing import List, Optional
from datetime import datetime

from app.models.database import (
    Empresa, UsuarioEmpresa, UserRole,
    HonorariosContador, TrilhaAuditoriaContador,
    LancamentoFinanceiro, StatusLancamento,
    ContaBancaria, RegraContabil, StatusPagamento,
    SegmentoMercado,
)
from app.schemas.contador import (
    EmpresaContadorRead,
    SwitchContextPayload,
    HonorariosContadorCreate,
    HonorariosContadorRead,
    PendenciasEmpresaRead,
)
from app.core.auth import get_session

router = APIRouter()


def _require_user(request: Request) -> UUID:
    """Extrai e valida o user_id do estado da requisição."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou ausente."
        )
    try:
        return UUID(str(user_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identidade do usuário inválida."
        )


def _require_contador_access(user_uuid: UUID, empresa_id: UUID, db: Session) -> UsuarioEmpresa:
    """Verifica que o usuário é CONTADOR com vínculo ativo à empresa."""
    vinculo = db.exec(
        select(UsuarioEmpresa).where(
            UsuarioEmpresa.usuario_id == user_uuid,
            UsuarioEmpresa.empresa_id == empresa_id,
            UsuarioEmpresa.role == UserRole.CONTADOR,
            UsuarioEmpresa.ativo == True,
        )
    ).first()
    if not vinculo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar esta empresa."
        )
    return vinculo


@router.get("/empresas", response_model=List[EmpresaContadorRead])
async def list_vinculos_contador(
    request: Request,
    db: Session = Depends(get_session)
):
    """Retorna a lista de empresas vinculadas ao contador autenticado."""
    user_uuid = _require_user(request)

    stmt = (
        select(Empresa)
        .join(UsuarioEmpresa)
        .where(
            UsuarioEmpresa.usuario_id == user_uuid,
            UsuarioEmpresa.role == UserRole.CONTADOR,
            UsuarioEmpresa.ativo == True,
        )
    )
    return db.exec(stmt).all()


@router.post("/switch-context")
async def switch_tenant_context(
    payload: SwitchContextPayload,
    request: Request,
    db: Session = Depends(get_session)
):
    """Registra a alternância de contexto na trilha de auditoria."""
    user_uuid = _require_user(request)
    _require_contador_access(user_uuid, payload.empresa_id, db)

    log = TrilhaAuditoriaContador(
        usuario_id=user_uuid,
        empresa_id=payload.empresa_id,
        acao="ALTERNANCIA_CONTEXTO",
        detalhes={"timestamp": datetime.now().isoformat()}
    )
    db.add(log)
    db.commit()

    return {"status": "success", "message": f"Contexto alterado para empresa {payload.empresa_id}"}


@router.get("/empresas/{empresa_id}/pendencias", response_model=PendenciasEmpresaRead)
async def get_pendencias_empresa(
    empresa_id: UUID,
    request: Request,
    db: Session = Depends(get_session)
):
    """Retorna pendências contábeis/financeiras básicas para uma empresa vinculada."""
    user_uuid = _require_user(request)
    _require_contador_access(user_uuid, empresa_id, db)

    lancamentos_abertos = db.exec(
        select(func.count(LancamentoFinanceiro.id)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
        )
    ).one()

    contas_sem_vinculo = db.exec(
        select(func.count(ContaBancaria.id)).where(
            ContaBancaria.empresa_id == empresa_id,
            ContaBancaria.ativo == True,
            ContaBancaria.conta_contabil_id == None,
        )
    ).one()

    total_regras = db.exec(
        select(func.count(RegraContabil.id)).where(
            RegraContabil.empresa_id == empresa_id,
            RegraContabil.ativo == True,
        )
    ).one()

    return PendenciasEmpresaRead(
        empresa_id=empresa_id,
        lancamentos_abertos=lancamentos_abertos,
        contas_sem_vinculo_contabil=contas_sem_vinculo,
        total_regras_contabeis=total_regras,
    )


@router.get("/dashboard-metrics")
async def get_dashboard_metrics(
    request: Request,
    db: Session = Depends(get_session)
):
    """Retorna métricas agregadas das empresas vinculadas ao contador."""
    user_uuid = _require_user(request)

    vinculos = db.exec(
        select(UsuarioEmpresa.empresa_id).where(
            UsuarioEmpresa.usuario_id == user_uuid,
            UsuarioEmpresa.role == UserRole.CONTADOR,
        )
    ).all()

    if not vinculos:
        return {"fiscal_distribution": [], "segment_distribution": []}

    fiscal_stats = db.exec(
        select(Empresa.classificacao_fiscal, func.count(Empresa.id))
        .where(Empresa.id.in_(vinculos))
        .group_by(Empresa.classificacao_fiscal)
    ).all()

    segment_stats = db.exec(
        select(SegmentoMercado.nome, func.count(Empresa.id))
        .join(Empresa, Empresa.segmento_mercado_id == SegmentoMercado.id)
        .where(Empresa.id.in_(vinculos))
        .group_by(SegmentoMercado.nome)
    ).all()

    return {
        "fiscal_distribution": [
            {"label": item[0], "value": item[1]} for item in fiscal_stats if item[0]
        ],
        "segment_distribution": [
            {"label": item[0], "value": item[1]} for item in segment_stats
        ],
    }


@router.get("/honorarios", response_model=List[HonorariosContadorRead])
async def list_honorarios(
    request: Request,
    status_filtro: Optional[str] = None,
    db: Session = Depends(get_session)
):
    """Lista os honorários do contador autenticado."""
    user_uuid = _require_user(request)

    stmt = select(HonorariosContador).where(
        HonorariosContador.usuario_id == user_uuid
    )
    if status_filtro:
        try:
            status_enum = StatusPagamento(status_filtro)
            stmt = stmt.where(HonorariosContador.status_pagamento == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status inválido: {status_filtro}"
            )

    return db.exec(stmt).all()


@router.post("/honorarios", response_model=HonorariosContadorRead, status_code=status.HTTP_201_CREATED)
async def create_honorario(
    honorario_in: HonorariosContadorCreate,
    request: Request,
    db: Session = Depends(get_session)
):
    """Registra um honorário para o contador autenticado."""
    user_uuid = _require_user(request)
    _require_contador_access(user_uuid, honorario_in.empresa_id, db)

    honorario = HonorariosContador(
        usuario_id=user_uuid,
        empresa_id=honorario_in.empresa_id,
        valor=honorario_in.valor,
        data_vencimento=honorario_in.data_vencimento,
        observacoes=honorario_in.observacoes,
    )
    db.add(honorario)
    db.commit()
    db.refresh(honorario)
    return honorario
