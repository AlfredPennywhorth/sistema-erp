import logging
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select, func
from uuid import UUID
from typing import List, Optional
from datetime import datetime, date

from app.models.database import (
    Empresa, UsuarioEmpresa, UserRole,
    HonorariosContador, TrilhaAuditoriaContador,
    LancamentoFinanceiro, StatusLancamento, NaturezaFinanceira,
    ContaBancaria, RegraContabil, StatusPagamento,
    SegmentoMercado, Emprestimo, ParcelaEmprestimo,
    AplicacaoFinanceira, StatusEmprestimo, StatusParcela,
    StatusAplicacaoFinanceira,
)
from app.schemas.contador import (
    EmpresaContadorRead,
    SwitchContextPayload,
    HonorariosContadorCreate,
    HonorariosContadorRead,
    PendenciasEmpresaRead,
)
from app.core.auth import get_session

logger = logging.getLogger(__name__)

router = APIRouter()


def _to_dec(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _round2(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


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

    logger.info("[CONTADOR] switch-context user=%s empresa=%s", user_uuid, payload.empresa_id)
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
            ContaBancaria.conta_contabil_id.is_(None),
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


# ---------------------------------------------------------------------------
# B.1 — Resumo consolidado de uma empresa para o portal do contador
# ---------------------------------------------------------------------------

@router.get("/empresas/{empresa_id}/resumo")
async def get_resumo_empresa(
    empresa_id: UUID,
    request: Request,
    db: Session = Depends(get_session)
):
    """
    Retorna resumo financeiro consolidado de uma empresa vinculada ao contador.
    Inclui: saldo bancário total, contas a pagar, contas a receber, regras contábeis e pendências.
    """
    user_uuid = _require_user(request)
    _require_contador_access(user_uuid, empresa_id, db)

    logger.info("[CONTADOR] resumo empresa=%s user=%s", empresa_id, user_uuid)

    today = date.today()

    # Saldo bancário total (soma de todas as contas ativas)
    saldo_bancario = _to_dec(db.exec(
        select(func.coalesce(func.sum(ContaBancaria.saldo_atual), 0)).where(
            ContaBancaria.empresa_id == empresa_id,
            ContaBancaria.ativo == True,
        )
    ).one())

    # Contas a pagar em aberto
    total_pagar = _to_dec(db.exec(
        select(func.coalesce(func.sum(LancamentoFinanceiro.valor_previsto), 0)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.natureza == NaturezaFinanceira.PAGAR,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
        )
    ).one())

    # Contas a receber em aberto
    total_receber = _to_dec(db.exec(
        select(func.coalesce(func.sum(LancamentoFinanceiro.valor_previsto), 0)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.natureza == NaturezaFinanceira.RECEBER,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
        )
    ).one())

    # Regras contábeis ativas
    total_regras = db.exec(
        select(func.count(RegraContabil.id)).where(
            RegraContabil.empresa_id == empresa_id,
            RegraContabil.ativo == True,
        )
    ).one()

    # Lançamentos em aberto (pendências)
    lancamentos_abertos = db.exec(
        select(func.count(LancamentoFinanceiro.id)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
        )
    ).one()

    # Contas sem vínculo contábil
    contas_sem_vinculo = db.exec(
        select(func.count(ContaBancaria.id)).where(
            ContaBancaria.empresa_id == empresa_id,
            ContaBancaria.ativo == True,
            ContaBancaria.conta_contabil_id.is_(None),
        )
    ).one()

    # Vencidos (pagamentos atrasados)
    lancamentos_vencidos = db.exec(
        select(func.count(LancamentoFinanceiro.id)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
            LancamentoFinanceiro.data_vencimento < today,
        )
    ).one()

    # Fluxo do mês corrente (entradas - saídas já liquidadas)
    primeiro_dia_mes = today.replace(day=1)
    entradas_mes = _to_dec(db.exec(
        select(func.coalesce(func.sum(LancamentoFinanceiro.valor_pago), 0)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.natureza == NaturezaFinanceira.RECEBER,
            LancamentoFinanceiro.status.in_([StatusLancamento.PAGO, StatusLancamento.CONCILIADO]),
            LancamentoFinanceiro.data_pagamento >= primeiro_dia_mes,
            LancamentoFinanceiro.data_pagamento <= today,
        )
    ).one())

    saidas_mes = _to_dec(db.exec(
        select(func.coalesce(func.sum(LancamentoFinanceiro.valor_pago), 0)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.natureza == NaturezaFinanceira.PAGAR,
            LancamentoFinanceiro.status.in_([StatusLancamento.PAGO, StatusLancamento.CONCILIADO]),
            LancamentoFinanceiro.data_pagamento >= primeiro_dia_mes,
            LancamentoFinanceiro.data_pagamento <= today,
        )
    ).one())

    return {
        "empresa_id": str(empresa_id),
        "saldo_bancario_total": _round2(saldo_bancario),
        "contas_a_pagar": _round2(total_pagar),
        "contas_a_receber": _round2(total_receber),
        "total_regras_contabeis": total_regras,
        "lancamentos_abertos": lancamentos_abertos,
        "lancamentos_vencidos": lancamentos_vencidos,
        "contas_sem_vinculo_contabil": contas_sem_vinculo,
        "fluxo_mes_corrente": {
            "entradas": _round2(entradas_mes),
            "saidas": _round2(saidas_mes),
            "saldo": _round2(entradas_mes - saidas_mes),
        },
    }


# ---------------------------------------------------------------------------
# C — Checklist de Fechamento Mensal
# ---------------------------------------------------------------------------

@router.get("/empresas/{empresa_id}/fechamento")
async def get_checklist_fechamento(
    empresa_id: UUID,
    request: Request,
    db: Session = Depends(get_session)
):
    """
    Retorna checklist de pendências para fechamento mensal de uma empresa vinculada.
    Cada item indica se está ok (concluído) ou pendente, com contagem.
    """
    user_uuid = _require_user(request)
    _require_contador_access(user_uuid, empresa_id, db)

    logger.info("[CONTADOR] fechamento empresa=%s user=%s", empresa_id, user_uuid)

    today = date.today()

    lancamentos_abertos = db.exec(
        select(func.count(LancamentoFinanceiro.id)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
        )
    ).one()

    lancamentos_vencidos = db.exec(
        select(func.count(LancamentoFinanceiro.id)).where(
            LancamentoFinanceiro.empresa_id == empresa_id,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
            LancamentoFinanceiro.data_vencimento < today,
        )
    ).one()

    contas_sem_vinculo = db.exec(
        select(func.count(ContaBancaria.id)).where(
            ContaBancaria.empresa_id == empresa_id,
            ContaBancaria.ativo == True,
            ContaBancaria.conta_contabil_id.is_(None),
        )
    ).one()

    total_regras = db.exec(
        select(func.count(RegraContabil.id)).where(
            RegraContabil.empresa_id == empresa_id,
            RegraContabil.ativo == True,
        )
    ).one()

    emprestimos_ativos = db.exec(
        select(func.count(Emprestimo.id)).where(
            Emprestimo.empresa_id == empresa_id,
            Emprestimo.status == StatusEmprestimo.ATIVO,
        )
    ).one()

    parcelas_vencidas = db.exec(
        select(func.count(ParcelaEmprestimo.id))
        .join(Emprestimo, ParcelaEmprestimo.emprestimo_id == Emprestimo.id)
        .where(
            Emprestimo.empresa_id == empresa_id,
            ParcelaEmprestimo.status == StatusParcela.PENDENTE,
            ParcelaEmprestimo.data_vencimento <= today,
        )
    ).one()

    aplicacoes_ativas = db.exec(
        select(func.count(AplicacaoFinanceira.id)).where(
            AplicacaoFinanceira.empresa_id == empresa_id,
            AplicacaoFinanceira.status == StatusAplicacaoFinanceira.ATIVA,
        )
    ).one()

    checklist = [
        {
            "item": "contas_a_pagar_em_aberto",
            "descricao": "Contas a pagar em aberto",
            "valor": lancamentos_abertos,
            "ok": lancamentos_abertos == 0,
        },
        {
            "item": "titulos_vencidos",
            "descricao": "Títulos vencidos (pagar/receber)",
            "valor": lancamentos_vencidos,
            "ok": lancamentos_vencidos == 0,
        },
        {
            "item": "contas_sem_vinculo_contabil",
            "descricao": "Contas bancárias sem vínculo contábil",
            "valor": contas_sem_vinculo,
            "ok": contas_sem_vinculo == 0,
        },
        {
            "item": "regras_contabeis_configuradas",
            "descricao": "Regras contábeis configuradas",
            "valor": total_regras,
            "ok": total_regras > 0,
        },
        {
            "item": "parcelas_emprestimo_vencidas",
            "descricao": "Parcelas de empréstimo vencidas",
            "valor": parcelas_vencidas,
            "ok": parcelas_vencidas == 0,
        },
        {
            "item": "emprestimos_ativos",
            "descricao": "Empréstimos ativos (requer cobertura contábil)",
            "valor": emprestimos_ativos,
            "ok": True,  # Informativo — empréstimos ativos não bloqueiam fechamento
        },
        {
            "item": "aplicacoes_financeiras_ativas",
            "descricao": "Aplicações financeiras ativas",
            "valor": aplicacoes_ativas,
            "ok": True,  # Informativo — aplicações ativas não bloqueiam fechamento
        },
    ]

    itens_pendentes = sum(1 for item in checklist if not item["ok"])
    pronto_para_fechar = itens_pendentes == 0

    return {
        "empresa_id": str(empresa_id),
        "data_referencia": str(today),
        "pronto_para_fechar": pronto_para_fechar,
        "itens_pendentes": itens_pendentes,
        "checklist": checklist,
    }
