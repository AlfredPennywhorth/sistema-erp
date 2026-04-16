"""
Módulo de Relatórios
---------------------
Fornece dados reais e filtráveis para as análises gerenciais:
  - Fluxo de Caixa: entradas/saídas por período com acumulado mensal
  - Contas a Pagar/Receber: totais em aberto, vencidos e liquidados
  - Pendências: indicadores confiáveis para acompanhamento contábil/financeiro
"""

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, func, select

from app.core.auth import get_current_tenant_id, get_session
from app.models.database import (
    AplicacaoFinanceira,
    ContaBancaria,
    Emprestimo,
    LancamentoFinanceiro,
    NaturezaFinanceira,
    ParcelaEmprestimo,
    RegraContabil,
    StatusAplicacaoFinanceira,
    StatusEmprestimo,
    StatusLancamento,
    StatusParcela,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# A.1 — Fluxo de Caixa
# ---------------------------------------------------------------------------

@router.get("/fluxo-caixa")
def get_fluxo_caixa(
    data_inicio: Optional[date] = Query(None, description="Data inicial (padrão: início do ano corrente)"),
    data_fim: Optional[date] = Query(None, description="Data final (padrão: hoje)"),
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """
    Relatório de Fluxo de Caixa.
    Retorna entradas e saídas agrupadas por mês e o saldo acumulado.
    Baseado apenas em lançamentos com status PAGO/CONCILIADO (regime de caixa).
    """
    today = date.today()
    inicio = data_inicio or date(today.year, 1, 1)
    fim = data_fim or today

    logger.info("[RELATORIOS] fluxo-caixa tenant=%s periodo=%s a %s", tenant_id, inicio, fim)

    statuses_pagos = [StatusLancamento.PAGO, StatusLancamento.CONCILIADO]

    # Entradas por mês
    stmt_entradas = (
        select(
            func.strftime("%Y-%m", LancamentoFinanceiro.data_pagamento).label("mes"),
            func.sum(LancamentoFinanceiro.valor_pago).label("total"),
        )
        .where(
            LancamentoFinanceiro.empresa_id == tenant_id,
            LancamentoFinanceiro.natureza == NaturezaFinanceira.RECEBER,
            LancamentoFinanceiro.status.in_(statuses_pagos),
            LancamentoFinanceiro.data_pagamento >= inicio,
            LancamentoFinanceiro.data_pagamento <= fim,
        )
        .group_by(func.strftime("%Y-%m", LancamentoFinanceiro.data_pagamento))
        .order_by(func.strftime("%Y-%m", LancamentoFinanceiro.data_pagamento))
    )

    # Saídas por mês
    stmt_saidas = (
        select(
            func.strftime("%Y-%m", LancamentoFinanceiro.data_pagamento).label("mes"),
            func.sum(LancamentoFinanceiro.valor_pago).label("total"),
        )
        .where(
            LancamentoFinanceiro.empresa_id == tenant_id,
            LancamentoFinanceiro.natureza == NaturezaFinanceira.PAGAR,
            LancamentoFinanceiro.status.in_(statuses_pagos),
            LancamentoFinanceiro.data_pagamento >= inicio,
            LancamentoFinanceiro.data_pagamento <= fim,
        )
        .group_by(func.strftime("%Y-%m", LancamentoFinanceiro.data_pagamento))
        .order_by(func.strftime("%Y-%m", LancamentoFinanceiro.data_pagamento))
    )

    entradas_raw = session.exec(stmt_entradas).all()
    saidas_raw = session.exec(stmt_saidas).all()

    entradas_map = {r[0]: float(r[1] or 0) for r in entradas_raw}
    saidas_map = {r[0]: float(r[1] or 0) for r in saidas_raw}

    # Consolidar todos os meses presentes nos dados
    todos_meses = sorted(set(list(entradas_map.keys()) + list(saidas_map.keys())))

    meses = []
    saldo_acumulado = 0.0
    for mes in todos_meses:
        entradas = entradas_map.get(mes, 0.0)
        saidas = saidas_map.get(mes, 0.0)
        saldo_mes = entradas - saidas
        saldo_acumulado += saldo_mes
        meses.append(
            {
                "mes": mes,
                "entradas": round(entradas, 2),
                "saidas": round(saidas, 2),
                "saldo_mes": round(saldo_mes, 2),
                "saldo_acumulado": round(saldo_acumulado, 2),
            }
        )

    # Totais gerais do período
    total_entradas = sum(m["entradas"] for m in meses)
    total_saidas = sum(m["saidas"] for m in meses)

    return {
        "periodo": {"inicio": str(inicio), "fim": str(fim)},
        "totais": {
            "entradas": round(total_entradas, 2),
            "saidas": round(total_saidas, 2),
            "saldo_liquido": round(total_entradas - total_saidas, 2),
        },
        "meses": meses,
    }


# ---------------------------------------------------------------------------
# A.2 — Contas a Pagar e Receber
# ---------------------------------------------------------------------------

@router.get("/contas-pagar-receber")
def get_contas_pagar_receber(
    data_inicio: Optional[date] = Query(None, description="Data de vencimento inicial (para liquidados)"),
    data_fim: Optional[date] = Query(None, description="Data de vencimento final (para liquidados)"),
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """
    Relatório de Contas a Pagar e Receber.
    Retorna totais em aberto, vencidos e liquidados por período.
    """
    today = date.today()
    inicio = data_inicio or date(today.year, today.month, 1)
    fim = data_fim or today

    logger.info("[RELATORIOS] contas-pagar-receber tenant=%s periodo=%s a %s", tenant_id, inicio, fim)

    def _totais(natureza: NaturezaFinanceira):
        # Em aberto (não vencido)
        em_aberto = session.exec(
            select(func.coalesce(func.sum(LancamentoFinanceiro.valor_previsto), 0)).where(
                LancamentoFinanceiro.empresa_id == tenant_id,
                LancamentoFinanceiro.natureza == natureza,
                LancamentoFinanceiro.status == StatusLancamento.ABERTO,
                LancamentoFinanceiro.data_vencimento >= today,
            )
        ).one()

        # Vencidos (em aberto e com vencimento passado)
        vencidos = session.exec(
            select(func.coalesce(func.sum(LancamentoFinanceiro.valor_previsto), 0)).where(
                LancamentoFinanceiro.empresa_id == tenant_id,
                LancamentoFinanceiro.natureza == natureza,
                LancamentoFinanceiro.status == StatusLancamento.ABERTO,
                LancamentoFinanceiro.data_vencimento < today,
            )
        ).one()

        # Liquidados no período
        liquidados = session.exec(
            select(func.coalesce(func.sum(LancamentoFinanceiro.valor_pago), 0)).where(
                LancamentoFinanceiro.empresa_id == tenant_id,
                LancamentoFinanceiro.natureza == natureza,
                LancamentoFinanceiro.status.in_([StatusLancamento.PAGO, StatusLancamento.CONCILIADO]),
                LancamentoFinanceiro.data_pagamento >= inicio,
                LancamentoFinanceiro.data_pagamento <= fim,
            )
        ).one()

        # Resumo em aberto (últimos lançamentos)
        abertos_lista = session.exec(
            select(
                LancamentoFinanceiro.id,
                LancamentoFinanceiro.descricao,
                LancamentoFinanceiro.valor_previsto,
                LancamentoFinanceiro.data_vencimento,
                LancamentoFinanceiro.status,
            )
            .where(
                LancamentoFinanceiro.empresa_id == tenant_id,
                LancamentoFinanceiro.natureza == natureza,
                LancamentoFinanceiro.status == StatusLancamento.ABERTO,
            )
            .order_by(LancamentoFinanceiro.data_vencimento.asc())
            .limit(10)
        ).all()

        return {
            "em_aberto": float(em_aberto or 0),
            "vencidos": float(vencidos or 0),
            "liquidados_no_periodo": float(liquidados or 0),
            "proximos_vencimentos": [
                {
                    "id": str(r[0]),
                    "descricao": r[1],
                    "valor": float(r[2] or 0),
                    "data_vencimento": str(r[3]),
                    "status": r[4],
                }
                for r in abertos_lista
            ],
        }

    return {
        "periodo": {"inicio": str(inicio), "fim": str(fim)},
        "pagar": _totais(NaturezaFinanceira.PAGAR),
        "receber": _totais(NaturezaFinanceira.RECEBER),
    }


# ---------------------------------------------------------------------------
# A.3 — Pendências Contábeis/Financeiras (para o tenant autenticado)
# ---------------------------------------------------------------------------

@router.get("/pendencias")
def get_pendencias(
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """
    Relatório de Pendências Contábeis e Financeiras do tenant ativo.
    Agrega indicadores que sinalizam o que falta para o fechamento mensal.
    """
    today = date.today()

    logger.info("[RELATORIOS] pendencias tenant=%s", tenant_id)

    lancamentos_abertos = session.exec(
        select(func.count(LancamentoFinanceiro.id)).where(
            LancamentoFinanceiro.empresa_id == tenant_id,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
        )
    ).one()

    lancamentos_vencidos = session.exec(
        select(func.count(LancamentoFinanceiro.id)).where(
            LancamentoFinanceiro.empresa_id == tenant_id,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO,
            LancamentoFinanceiro.data_vencimento < today,
        )
    ).one()

    contas_sem_vinculo = session.exec(
        select(func.count(ContaBancaria.id)).where(
            ContaBancaria.empresa_id == tenant_id,
            ContaBancaria.ativo == True,
            ContaBancaria.conta_contabil_id.is_(None),
        )
    ).one()

    total_regras = session.exec(
        select(func.count(RegraContabil.id)).where(
            RegraContabil.empresa_id == tenant_id,
            RegraContabil.ativo == True,
        )
    ).one()

    emprestimos_ativos = session.exec(
        select(func.count(Emprestimo.id)).where(
            Emprestimo.empresa_id == tenant_id,
            Emprestimo.status == StatusEmprestimo.ATIVO,
        )
    ).one()

    parcelas_emprestimo_em_aberto = session.exec(
        select(func.count(ParcelaEmprestimo.id))
        .join(Emprestimo, ParcelaEmprestimo.emprestimo_id == Emprestimo.id)
        .where(
            Emprestimo.empresa_id == tenant_id,
            ParcelaEmprestimo.status == StatusParcela.PENDENTE,
            ParcelaEmprestimo.data_vencimento <= today,
        )
    ).one()

    aplicacoes_ativas = session.exec(
        select(func.count(AplicacaoFinanceira.id)).where(
            AplicacaoFinanceira.empresa_id == tenant_id,
            AplicacaoFinanceira.status == StatusAplicacaoFinanceira.ATIVA,
        )
    ).one()

    return {
        "lancamentos_abertos": lancamentos_abertos,
        "lancamentos_vencidos": lancamentos_vencidos,
        "contas_sem_vinculo_contabil": contas_sem_vinculo,
        "total_regras_contabeis": total_regras,
        "emprestimos_ativos": emprestimos_ativos,
        "parcelas_emprestimo_vencidas": parcelas_emprestimo_em_aberto,
        "aplicacoes_financeiras_ativas": aplicacoes_ativas,
    }
