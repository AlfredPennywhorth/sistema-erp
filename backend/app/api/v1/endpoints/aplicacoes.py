"""
Módulo de Aplicações Financeiras
---------------------------------
Trata aplicações como entidade separada do caixa operacional.
Regra principal: NÃO misturar saldo de aplicação com ContaBancaria.saldo_atual.

Fluxo:
  APLICAR  → ContaBancaria.saldo_atual -= valor_aplicado
             AplicacaoFinanceira criada com saldo_atual = valor_aplicado
  RENDIMENTO → AplicacaoFinanceira.saldo_atual += valor
               JournalEntry: D Aplicação / C Receita
  RESGATAR → AplicacaoFinanceira.saldo_atual -= valor_bruto
             ContaBancaria.saldo_atual += valor_liquido
             JournalEntry: D Banco / C Aplicação; D Despesa / C Banco (IR+IOF)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from uuid import UUID
from datetime import date
from decimal import Decimal
from typing import List, Optional

from app.models.database import (
    AplicacaoFinanceira,
    RendimentoAplicacao,
    ResgateAplicacao,
    ContaBancaria,
    PlanoConta,
    JournalEntry,
    LogAuditoria,
    StatusAplicacaoFinanceira,
    TipoResgate,
)
from app.schemas.aplicacoes import (
    AplicacaoFinanceiraCreate,
    AplicacaoFinanceiraUpdate,
    AplicacaoFinanceiraRead,
    AplicacaoFinanceiraListRead,
    RendimentoCreate,
    RendimentoRead,
    ResgateCreate,
    ResgateRead,
)
from app.core.auth import get_session, get_current_tenant_id, get_current_user_id

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_aplicacao_or_404(
    aplicacao_id: UUID,
    tenant_id: UUID,
    session: Session,
) -> AplicacaoFinanceira:
    aplicacao = session.get(AplicacaoFinanceira, aplicacao_id)
    if not aplicacao or aplicacao.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Aplicação financeira não encontrada.")
    return aplicacao


def _get_conta_bancaria_or_404(
    conta_id: UUID,
    tenant_id: UUID,
    session: Session,
) -> ContaBancaria:
    conta = session.get(ContaBancaria, conta_id)
    if not conta or conta.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")
    return conta


def _registrar_journal_entry(
    session: Session,
    empresa_id: UUID,
    usuario_id: UUID,
    conta_debito_id: UUID,
    conta_credito_id: UUID,
    valor: Decimal,
    historico: str,
    documento_ref: Optional[str] = None,
) -> None:
    """Gera um par de lançamentos contábeis (débito + crédito) no journal."""
    data_hoje = date.today()
    session.add(JournalEntry(
        conta_id=conta_debito_id,
        empresa_id=empresa_id,
        data_lancamento=data_hoje,
        valor=valor,
        debito_credito="D",
        historico=historico,
        documento_referencia=documento_ref,
        modulo_origem="APLICACOES",
        usuario_id=usuario_id,
    ))
    session.add(JournalEntry(
        conta_id=conta_credito_id,
        empresa_id=empresa_id,
        data_lancamento=data_hoje,
        valor=valor,
        debito_credito="C",
        historico=historico,
        documento_referencia=documento_ref,
        modulo_origem="APLICACOES",
        usuario_id=usuario_id,
    ))


def _log_auditoria(
    session: Session,
    empresa_id: UUID,
    usuario_id: UUID,
    acao: str,
    tabela: str,
    registro_id: UUID,
    dados_anteriores=None,
    dados_novos=None,
) -> None:
    session.add(LogAuditoria(
        empresa_id=empresa_id,
        usuario_id=usuario_id,
        acao=acao,
        tabela_afetada=tabela,
        registro_id=registro_id,
        dados_anteriores=dados_anteriores,
        dados_novos=dados_novos,
    ))


# ---------------------------------------------------------------------------
# CRUD — AplicacaoFinanceira
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[AplicacaoFinanceiraListRead])
def list_aplicacoes(
    status_filtro: Optional[StatusAplicacaoFinanceira] = None,
    tipo: Optional[str] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """Lista todas as aplicações financeiras da empresa."""
    stmt = (
        select(AplicacaoFinanceira, ContaBancaria.nome.label("conta_bancaria_nome"))
        .join(ContaBancaria, AplicacaoFinanceira.conta_bancaria_origem_id == ContaBancaria.id, isouter=True)
        .where(AplicacaoFinanceira.empresa_id == tenant_id)
    )
    if status_filtro:
        stmt = stmt.where(AplicacaoFinanceira.status == status_filtro)
    if tipo:
        stmt = stmt.where(AplicacaoFinanceira.tipo == tipo)

    stmt = stmt.order_by(AplicacaoFinanceira.data_aplicacao.desc())
    rows = session.exec(stmt).all()

    result = []
    for aplicacao, conta_bancaria_nome in rows:
        data = aplicacao.model_dump(mode="json")
        data["conta_bancaria_nome"] = conta_bancaria_nome
        # Rendimento percentual sobre o valor aplicado
        if aplicacao.valor_aplicado and aplicacao.valor_aplicado > 0:
            data["rendimento_percentual"] = (
                (aplicacao.rendimento_total / aplicacao.valor_aplicado) * 100
            ).quantize(Decimal("0.0001"))
        else:
            data["rendimento_percentual"] = Decimal("0")
        result.append(data)
    return result


@router.post("/", response_model=AplicacaoFinanceiraRead, status_code=status.HTTP_201_CREATED)
def criar_aplicacao(
    payload: AplicacaoFinanceiraCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """
    Cria uma nova aplicação financeira e debita o valor da conta bancária de origem.
    REGRA: NÃO mistura o saldo da aplicação com o saldo bancário operacional.
    """
    # Validar conta bancária de origem
    conta_origem = _get_conta_bancaria_or_404(payload.conta_bancaria_origem_id, tenant_id, session)

    if conta_origem.saldo_atual < payload.valor_aplicado:
        raise HTTPException(
            status_code=400,
            detail="Saldo insuficiente na conta bancária de origem.",
        )

    # Validar contas contábeis
    for campo, conta_id in [
        ("conta_contabil_aplicacao_id", payload.conta_contabil_aplicacao_id),
        ("conta_contabil_receita_id", payload.conta_contabil_receita_id),
        ("conta_contabil_despesa_id", payload.conta_contabil_despesa_id),
    ]:
        pc = session.get(PlanoConta, conta_id)
        if not pc or pc.empresa_id != tenant_id:
            raise HTTPException(status_code=400, detail=f"Conta contábil inválida: {campo}")

    # Criar aplicação
    aplicacao = AplicacaoFinanceira(
        **payload.model_dump(),
        empresa_id=tenant_id,
        saldo_atual=payload.valor_aplicado,
        rendimento_total=Decimal("0"),
        status=StatusAplicacaoFinanceira.ATIVA,
        usuario_criacao_id=user_id,
    )
    session.add(aplicacao)

    # Debitar conta bancária de origem (saída de caixa operacional)
    conta_origem.saldo_atual -= payload.valor_aplicado
    session.add(conta_origem)

    # Lançamento contábil: D Aplicação (ATIVO valoriza com a entrada dos recursos)
    # Nota: a contrapartida (C Banco) requer que ContaBancaria tenha conta_contabil_id
    # Por ora registramos apenas a movimentação de criação da aplicação
    session.add(JournalEntry(
        conta_id=payload.conta_contabil_aplicacao_id,
        empresa_id=tenant_id,
        data_lancamento=payload.data_aplicacao,
        valor=payload.valor_aplicado,
        debito_credito="D",
        historico=f"Aplicação financeira criada: {payload.nome}",
        modulo_origem="APLICACOES",
        usuario_id=user_id,
    ))

    session.commit()
    session.refresh(aplicacao)

    _log_auditoria(
        session=session,
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="CREATE",
        tabela="aplicacoes_financeiras",
        registro_id=aplicacao.id,
        dados_novos=aplicacao.model_dump(mode="json"),
    )
    session.commit()

    return aplicacao


@router.get("/{aplicacao_id}", response_model=AplicacaoFinanceiraRead)
def get_aplicacao(
    aplicacao_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    return _get_aplicacao_or_404(aplicacao_id, tenant_id, session)


@router.patch("/{aplicacao_id}", response_model=AplicacaoFinanceiraRead)
def atualizar_aplicacao(
    aplicacao_id: UUID,
    payload: AplicacaoFinanceiraUpdate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """Atualiza metadados de uma aplicação (nome, vencimento, vínculos contábeis)."""
    aplicacao = _get_aplicacao_or_404(aplicacao_id, tenant_id, session)
    dados_anteriores = aplicacao.model_dump(mode="json")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(aplicacao, key, value)

    session.add(aplicacao)
    session.commit()
    session.refresh(aplicacao)

    _log_auditoria(
        session=session,
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="UPDATE",
        tabela="aplicacoes_financeiras",
        registro_id=aplicacao.id,
        dados_anteriores=dados_anteriores,
        dados_novos=aplicacao.model_dump(mode="json"),
    )
    session.commit()

    return aplicacao


# ---------------------------------------------------------------------------
# Rendimentos
# ---------------------------------------------------------------------------

@router.get("/{aplicacao_id}/rendimentos", response_model=List[RendimentoRead])
def list_rendimentos(
    aplicacao_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """Lista o histórico de rendimentos de uma aplicação."""
    _get_aplicacao_or_404(aplicacao_id, tenant_id, session)
    stmt = (
        select(RendimentoAplicacao)
        .where(
            RendimentoAplicacao.aplicacao_id == aplicacao_id,
            RendimentoAplicacao.empresa_id == tenant_id,
        )
        .order_by(RendimentoAplicacao.data_rendimento.desc())
    )
    return session.exec(stmt).all()


@router.post(
    "/{aplicacao_id}/registrar-rendimento",
    response_model=RendimentoRead,
    status_code=status.HTTP_201_CREATED,
)
def registrar_rendimento(
    aplicacao_id: UUID,
    payload: RendimentoCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """
    Registra um evento de rendimento na aplicação.
    Atualiza saldo_atual e rendimento_total da aplicação.
    Gera JournalEntry: D Conta Aplicação (ATIVO) / C Conta Receita.
    NÃO toca o saldo bancário — o dinheiro ainda está na aplicação.
    """
    aplicacao = _get_aplicacao_or_404(aplicacao_id, tenant_id, session)

    if aplicacao.status != StatusAplicacaoFinanceira.ATIVA:
        raise HTTPException(
            status_code=400,
            detail="Rendimentos só podem ser registrados em aplicações ATIVAS.",
        )

    saldo_antes = aplicacao.saldo_atual

    rendimento = RendimentoAplicacao(
        aplicacao_id=aplicacao_id,
        empresa_id=tenant_id,
        data_rendimento=payload.data_rendimento,
        valor_rendimento=payload.valor_rendimento,
        saldo_antes=saldo_antes,
        saldo_depois=saldo_antes + payload.valor_rendimento,
        observacoes=payload.observacoes,
        usuario_id=user_id,
    )
    session.add(rendimento)

    # Atualizar saldos da aplicação
    aplicacao.saldo_atual += payload.valor_rendimento
    aplicacao.rendimento_total += payload.valor_rendimento
    session.add(aplicacao)

    # Lançamento contábil: D Aplicação (ATIVO valoriza) / C Receita de Rendimentos
    _registrar_journal_entry(
        session=session,
        empresa_id=tenant_id,
        usuario_id=user_id,
        conta_debito_id=aplicacao.conta_contabil_aplicacao_id,
        conta_credito_id=aplicacao.conta_contabil_receita_id,
        valor=payload.valor_rendimento,
        historico=f"Rendimento: {aplicacao.nome} em {payload.data_rendimento}",
    )

    session.commit()
    session.refresh(rendimento)

    _log_auditoria(
        session=session,
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="RENDIMENTO",
        tabela="rendimentos_aplicacao",
        registro_id=rendimento.id,
        dados_novos=rendimento.model_dump(mode="json"),
    )
    session.commit()

    return rendimento


# ---------------------------------------------------------------------------
# Resgates
# ---------------------------------------------------------------------------

@router.get("/{aplicacao_id}/resgates", response_model=List[ResgateRead])
def list_resgates(
    aplicacao_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """Lista o histórico de resgates de uma aplicação."""
    _get_aplicacao_or_404(aplicacao_id, tenant_id, session)
    stmt = (
        select(ResgateAplicacao)
        .where(
            ResgateAplicacao.aplicacao_id == aplicacao_id,
            ResgateAplicacao.empresa_id == tenant_id,
        )
        .order_by(ResgateAplicacao.data_resgate.desc())
    )
    return session.exec(stmt).all()


@router.post(
    "/{aplicacao_id}/resgatar",
    response_model=ResgateRead,
    status_code=status.HTTP_201_CREATED,
)
def resgatar_aplicacao(
    aplicacao_id: UUID,
    payload: ResgateCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """
    Processa o resgate (parcial ou total) de uma aplicação financeira.

    Regras:
      - valor_bruto não pode exceder saldo_atual da aplicação
      - valor_liquido = valor_bruto - ir_retido - iof_retido
      - ContaBancaria.saldo_atual += valor_liquido   (crédito operacional)
      - AplicacaoFinanceira.saldo_atual -= valor_bruto
      - Se resgate TOTAL: status → RESGATADA, data_resgate = hoje
      - JournalEntry: D Conta Bancária / C Conta Aplicação (valor_bruto)
      - JournalEntry: D Conta Despesa / C Conta Bancária (ir + iof) se houver retenção
    """
    aplicacao = _get_aplicacao_or_404(aplicacao_id, tenant_id, session)

    if aplicacao.status != StatusAplicacaoFinanceira.ATIVA:
        raise HTTPException(
            status_code=400,
            detail="Apenas aplicações ATIVAS podem ser resgatadas.",
        )

    if payload.valor_bruto > aplicacao.saldo_atual:
        raise HTTPException(
            status_code=400,
            detail=f"Valor de resgate ({payload.valor_bruto}) excede o saldo atual da aplicação ({aplicacao.saldo_atual}).",
        )

    conta_destino = _get_conta_bancaria_or_404(payload.conta_bancaria_destino_id, tenant_id, session)

    valor_liquido = payload.valor_bruto - payload.ir_retido - payload.iof_retido
    if valor_liquido <= 0:
        raise HTTPException(
            status_code=400,
            detail="Valor líquido do resgate deve ser positivo.",
        )

    dados_anteriores_aplicacao = aplicacao.model_dump(mode="json")

    # Registrar resgate
    resgate = ResgateAplicacao(
        aplicacao_id=aplicacao_id,
        empresa_id=tenant_id,
        tipo=payload.tipo,
        data_resgate=payload.data_resgate,
        valor_bruto=payload.valor_bruto,
        ir_retido=payload.ir_retido,
        iof_retido=payload.iof_retido,
        valor_liquido=valor_liquido,
        conta_bancaria_destino_id=payload.conta_bancaria_destino_id,
        observacoes=payload.observacoes,
        usuario_id=user_id,
    )
    session.add(resgate)

    # Atualizar saldo da aplicação (SEPARADO do saldo bancário)
    aplicacao.saldo_atual -= payload.valor_bruto
    if payload.tipo == TipoResgate.TOTAL:
        aplicacao.status = StatusAplicacaoFinanceira.RESGATADA
        aplicacao.data_resgate = payload.data_resgate
    session.add(aplicacao)

    # Creditar valor líquido na conta bancária operacional
    conta_destino.saldo_atual += valor_liquido
    session.add(conta_destino)

    # Lançamento contábil 1: C Conta Aplicação (ATIVO reduz ao resgatar)
    # Nota: D Banco requer conta_contabil_id na ContaBancaria; registramos a saída da aplicação
    session.add(JournalEntry(
        conta_id=aplicacao.conta_contabil_aplicacao_id,
        empresa_id=tenant_id,
        data_lancamento=payload.data_resgate,
        valor=payload.valor_bruto,
        debito_credito="C",
        historico=f"Resgate {payload.tipo}: {aplicacao.nome} em {payload.data_resgate}",
        modulo_origem="APLICACOES",
        usuario_id=user_id,
    ))

    # Lançamento contábil 2: D Despesa IR/IOF (retenções sobre o resgate)
    retencoes = payload.ir_retido + payload.iof_retido
    if retencoes > 0:
        session.add(JournalEntry(
            conta_id=aplicacao.conta_contabil_despesa_id,
            empresa_id=tenant_id,
            data_lancamento=payload.data_resgate,
            valor=retencoes,
            debito_credito="D",
            historico=f"IR/IOF sobre resgate: {aplicacao.nome}",
            modulo_origem="APLICACOES",
            usuario_id=user_id,
        ))

    session.commit()
    session.refresh(resgate)

    _log_auditoria(
        session=session,
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="RESGATAR",
        tabela="resgates_aplicacao",
        registro_id=resgate.id,
        dados_anteriores=dados_anteriores_aplicacao,
        dados_novos=resgate.model_dump(mode="json"),
    )
    session.commit()

    return resgate


# ---------------------------------------------------------------------------
# Dashboard de Aplicações
# ---------------------------------------------------------------------------

@router.get("/dashboard/resumo")
def dashboard_aplicacoes(
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """Retorna resumo consolidado das aplicações financeiras."""
    stmt_total = select(
        func.sum(AplicacaoFinanceira.saldo_atual),
        func.sum(AplicacaoFinanceira.valor_aplicado),
        func.sum(AplicacaoFinanceira.rendimento_total),
        func.count(AplicacaoFinanceira.id),
    ).where(
        AplicacaoFinanceira.empresa_id == tenant_id,
        AplicacaoFinanceira.status == StatusAplicacaoFinanceira.ATIVA,
    )
    row = session.exec(stmt_total).one()

    saldo_total = row[0] or Decimal("0")
    valor_aplicado_total = row[1] or Decimal("0")
    rendimento_total = row[2] or Decimal("0")
    qtd_ativas = row[3] or 0

    return {
        "saldo_total_aplicacoes": saldo_total,
        "valor_aplicado_total": valor_aplicado_total,
        "rendimento_total_acumulado": rendimento_total,
        "quantidade_ativas": qtd_ativas,
        "rentabilidade_percentual": (
            (rendimento_total / valor_aplicado_total * 100).quantize(Decimal("0.0001"))
            if valor_aplicado_total > 0
            else Decimal("0")
        ),
    }
