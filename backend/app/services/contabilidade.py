"""
Serviço de Lançamentos Contábeis

Funções principais:
- criar_lote_e_partidas: cria um LoteContabil balanceado com suas JournalEntries
- disparar_lancamento_por_regra: busca RegraContabil e chama criar_lote_e_partidas

Regra de ouro: soma(débitos) == soma(créditos) por lote.
Falhas de regra contábil NÃO bloqueiam operações financeiras — retornam None.
"""
import logging
from decimal import Decimal
from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.database import (
    JournalEntry,
    LoteContabil,
    PlanoConta,
    RegraContabil,
    StatusLoteContabil,
    NaturezaFinanceira,
    TipoEventoContabil,
)

logger = logging.getLogger(__name__)

_ZERO = Decimal("0")


def _to_dec(value) -> Decimal:
    if value is None:
        return _ZERO
    return Decimal(str(value))


def criar_lote_e_partidas(
    db: Session,
    empresa_id: UUID,
    data: date,
    historico: str,
    partidas: List[dict],  # [{"conta_id": UUID, "valor": Decimal, "debito_credito": "D"|"C"}]
    modulo_origem: str = "MANUAL",
    lancamento_financeiro_id: Optional[UUID] = None,
    usuario_id: Optional[UUID] = None,
    documento_referencia: Optional[str] = None,
) -> LoteContabil:
    """
    Cria um LoteContabil balanceado com suas partidas (JournalEntries).

    Valida:
    - Soma dos débitos == soma dos créditos (precisão Decimal)
    - Todas as contas existem e pertencem à empresa
    - Todas as contas são analíticas (is_analitica = True)
    - Todas as contas estão ativas

    Levanta HTTPException 422 se desequilibrado.
    Levanta HTTPException 400 se conta inválida.
    """
    soma_debitos = _ZERO
    soma_creditos = _ZERO

    # Validar partidas e somar
    for p in partidas:
        conta_id = p["conta_id"]
        valor = _to_dec(p["valor"])
        dc = p["debito_credito"]

        conta = db.get(PlanoConta, conta_id)
        if not conta or str(conta.empresa_id) != str(empresa_id):
            raise HTTPException(status_code=400, detail=f"Conta {conta_id} não encontrada ou não pertence a esta empresa.")
        if not conta.ativo:
            raise HTTPException(status_code=400, detail=f"Conta '{conta.nome}' está inativa.")
        if not conta.is_analitica:
            raise HTTPException(status_code=400, detail=f"Conta '{conta.nome}' é sintética. Apenas contas analíticas recebem lançamentos.")

        if dc == "D":
            soma_debitos += valor
        elif dc == "C":
            soma_creditos += valor
        else:
            raise HTTPException(status_code=400, detail=f"debito_credito deve ser 'D' ou 'C'. Recebido: '{dc}'")

    # Validar equilíbrio com tolerância de 1 centavo para arredondamentos
    if abs(soma_debitos - soma_creditos) > Decimal("0.01"):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Lançamento desequilibrado. "
                f"Débitos: R$ {soma_debitos:.2f} / Créditos: R$ {soma_creditos:.2f}. "
                f"Diferença: R$ {abs(soma_debitos - soma_creditos):.2f}"
            ),
        )

    # Criar o lote
    lote = LoteContabil(
        empresa_id=empresa_id,
        data_lancamento=data,
        historico=historico,
        documento_referencia=documento_referencia,
        modulo_origem=modulo_origem,
        lancamento_financeiro_id=lancamento_financeiro_id,
        usuario_id=usuario_id,
        status=StatusLoteContabil.ABERTO,
    )
    db.add(lote)
    db.flush()  # Obter o ID do lote antes de criar as partidas

    # Criar as JournalEntries vinculadas ao lote
    for p in partidas:
        entry = JournalEntry(
            conta_id=p["conta_id"],
            empresa_id=empresa_id,
            data_lancamento=data,
            valor=_to_dec(p["valor"]),
            debito_credito=p["debito_credito"],
            historico=historico,
            documento_referencia=documento_referencia,
            modulo_origem=modulo_origem,
            usuario_id=usuario_id,
            lote_id=lote.id,
        )
        db.add(entry)

    return lote


def disparar_lancamento_por_regra(
    db: Session,
    empresa_id: UUID,
    tipo_evento: TipoEventoContabil,
    natureza: NaturezaFinanceira,
    valor: Decimal,
    data: date,
    lancamento_financeiro_id: Optional[UUID] = None,
    usuario_id: Optional[UUID] = None,
    referencia: Optional[str] = None,
    historico_extra: Optional[str] = None,
) -> Optional[LoteContabil]:
    """
    Busca a RegraContabil ativa para o evento/natureza e cria o lançamento contábil.

    Retorna None silenciosamente se:
    - A empresa não configurou a regra contábil para este evento
    - A regra está inativa

    NUNCA bloqueia operações financeiras — usa warn e retorna None em caso de falha.
    """
    try:
        regra = db.exec(
            select(RegraContabil).where(
                RegraContabil.empresa_id == empresa_id,
                RegraContabil.tipo_evento == tipo_evento,
                RegraContabil.natureza == natureza,
                RegraContabil.ativo == True,
            )
        ).first()

        if not regra:
            logger.warning(
                "[CONTABIL] Regra contábil não configurada para empresa=%s evento=%s natureza=%s — lançamento contábil ignorado.",
                empresa_id, tipo_evento, natureza
            )
            return None

        historico = regra.historico_padrao or f"{tipo_evento} / {natureza}"
        if historico_extra:
            historico = f"{historico} — {historico_extra}"

        partidas = [
            {"conta_id": regra.conta_debito_id, "valor": valor, "debito_credito": "D"},
            {"conta_id": regra.conta_credito_id, "valor": valor, "debito_credito": "C"},
        ]

        lote = criar_lote_e_partidas(
            db=db,
            empresa_id=empresa_id,
            data=data,
            historico=historico,
            partidas=partidas,
            modulo_origem="FINANCEIRO",
            lancamento_financeiro_id=lancamento_financeiro_id,
            usuario_id=usuario_id,
            documento_referencia=referencia,
        )
        return lote

    except HTTPException:
        # Contas podem estar inativas ou serem sintéticas — log e continua
        logger.warning(
            "[CONTABIL] Falha ao criar lançamento contábil para empresa=%s evento=%s — operação financeira não bloqueada.",
            empresa_id, tipo_evento, exc_info=True
        )
        return None
    except Exception:
        logger.warning(
            "[CONTABIL] Erro inesperado ao disparar lançamento contábil empresa=%s evento=%s.",
            empresa_id, tipo_evento, exc_info=True
        )
        return None
