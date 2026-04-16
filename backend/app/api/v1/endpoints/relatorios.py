"""
Módulo de Relatórios
---------------------
Fornece dados reais e filtráveis para as análises gerenciais:
  - Fluxo de Caixa: entradas/saídas por período com acumulado mensal
  - Contas a Pagar/Receber: totais em aberto, vencidos e liquidados
  - Pendências: indicadores confiáveis para acompanhamento contábil/financeiro
"""

import logging
from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
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


def _to_dec(value) -> Decimal:
    """Converte valores do banco para Decimal com segurança."""
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _round2(value: Decimal) -> float:
    """Arredonda para 2 casas decimais e converte para float para serialização."""
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


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
    Agrupamento feito em Python para compatibilidade entre SQLite e PostgreSQL.
    """
    today = date.today()
    inicio = data_inicio or date(today.year, 1, 1)
    fim = data_fim or today

    logger.info("[RELATORIOS] fluxo-caixa tenant=%s periodo=%s a %s", tenant_id, inicio, fim)

    statuses_pagos = [StatusLancamento.PAGO, StatusLancamento.CONCILIADO]

    rows = session.exec(
        select(
            LancamentoFinanceiro.natureza,
            LancamentoFinanceiro.data_pagamento,
            LancamentoFinanceiro.valor_pago,
        ).where(
            LancamentoFinanceiro.empresa_id == tenant_id,
            LancamentoFinanceiro.status.in_(statuses_pagos),
            LancamentoFinanceiro.data_pagamento >= inicio,
            LancamentoFinanceiro.data_pagamento <= fim,
        )
    ).all()

    entradas_map: dict[str, Decimal] = defaultdict(Decimal)
    saidas_map: dict[str, Decimal] = defaultdict(Decimal)

    for natureza, data_pag, valor in rows:
        if data_pag is None:
            continue
        mes_key = data_pag.strftime("%Y-%m")
        v = _to_dec(valor)
        if natureza == NaturezaFinanceira.RECEBER:
            entradas_map[mes_key] += v
        else:
            saidas_map[mes_key] += v

    todos_meses = sorted(set(list(entradas_map.keys()) + list(saidas_map.keys())))

    meses = []
    saldo_acumulado = Decimal("0")
    for mes in todos_meses:
        entradas = entradas_map.get(mes, Decimal("0"))
        saidas = saidas_map.get(mes, Decimal("0"))
        saldo_mes = entradas - saidas
        saldo_acumulado += saldo_mes
        meses.append(
            {
                "mes": mes,
                "entradas": _round2(entradas),
                "saidas": _round2(saidas),
                "saldo_mes": _round2(saldo_mes),
                "saldo_acumulado": _round2(saldo_acumulado),
            }
        )

    total_entradas = sum(entradas_map.values(), Decimal("0"))
    total_saidas = sum(saidas_map.values(), Decimal("0"))

    return {
        "periodo": {"inicio": str(inicio), "fim": str(fim)},
        "totais": {
            "entradas": _round2(total_entradas),
            "saidas": _round2(total_saidas),
            "saldo_liquido": _round2(total_entradas - total_saidas),
        },
        "meses": meses,
    }


# ---------------------------------------------------------------------------
# A.2 — Contas a Pagar e Receber
# ---------------------------------------------------------------------------

@router.get("/contas-pagar-receber")
def get_contas_pagar_receber(
    data_inicio: Optional[date] = Query(None, description="Data de pagamento inicial (para liquidados)"),
    data_fim: Optional[date] = Query(None, description="Data de pagamento final (para liquidados)"),
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

    def _totais(natureza: NaturezaFinanceira) -> dict:
        em_aberto = _to_dec(session.exec(
            select(func.coalesce(func.sum(LancamentoFinanceiro.valor_previsto), 0)).where(
                LancamentoFinanceiro.empresa_id == tenant_id,
                LancamentoFinanceiro.natureza == natureza,
                LancamentoFinanceiro.status == StatusLancamento.ABERTO,
                LancamentoFinanceiro.data_vencimento >= today,
            )
        ).one())

        vencidos = _to_dec(session.exec(
            select(func.coalesce(func.sum(LancamentoFinanceiro.valor_previsto), 0)).where(
                LancamentoFinanceiro.empresa_id == tenant_id,
                LancamentoFinanceiro.natureza == natureza,
                LancamentoFinanceiro.status == StatusLancamento.ABERTO,
                LancamentoFinanceiro.data_vencimento < today,
            )
        ).one())

        liquidados = _to_dec(session.exec(
            select(func.coalesce(func.sum(LancamentoFinanceiro.valor_pago), 0)).where(
                LancamentoFinanceiro.empresa_id == tenant_id,
                LancamentoFinanceiro.natureza == natureza,
                LancamentoFinanceiro.status.in_([StatusLancamento.PAGO, StatusLancamento.CONCILIADO]),
                LancamentoFinanceiro.data_pagamento >= inicio,
                LancamentoFinanceiro.data_pagamento <= fim,
            )
        ).one())

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
            "em_aberto": _round2(em_aberto),
            "vencidos": _round2(vencidos),
            "liquidados_no_periodo": _round2(liquidados),
            "proximos_vencimentos": [
                {
                    "id": str(r[0]),
                    "descricao": r[1],
                    "valor": _round2(_to_dec(r[2])),
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
