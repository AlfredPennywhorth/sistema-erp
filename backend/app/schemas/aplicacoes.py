from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime, date

from app.models.database import (
    TipoAplicacaoFinanceira,
    StatusAplicacaoFinanceira,
    TipoResgate,
)


# ---------------------------------------------------------------------------
# AplicacaoFinanceira
# ---------------------------------------------------------------------------

class AplicacaoFinanceiraCreate(BaseModel):
    conta_bancaria_origem_id: UUID
    nome: str = Field(..., max_length=255)
    tipo: TipoAplicacaoFinanceira = TipoAplicacaoFinanceira.CDB
    instituicao: Optional[str] = Field(None, max_length=255)
    numero_contrato: Optional[str] = Field(None, max_length=100)
    valor_aplicado: Decimal = Field(..., gt=0)
    taxa_rendimento: Optional[Decimal] = None
    data_aplicacao: date
    data_vencimento: Optional[date] = None
    conta_contabil_aplicacao_id: UUID
    conta_contabil_receita_id: UUID
    conta_contabil_despesa_id: UUID
    observacoes: Optional[str] = None

    class Config:
        from_attributes = True


class AplicacaoFinanceiraUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    instituicao: Optional[str] = Field(None, max_length=255)
    numero_contrato: Optional[str] = Field(None, max_length=100)
    taxa_rendimento: Optional[Decimal] = None
    data_vencimento: Optional[date] = None
    conta_contabil_aplicacao_id: Optional[UUID] = None
    conta_contabil_receita_id: Optional[UUID] = None
    conta_contabil_despesa_id: Optional[UUID] = None
    observacoes: Optional[str] = None

    class Config:
        from_attributes = True


class AplicacaoFinanceiraRead(BaseModel):
    id: UUID
    empresa_id: UUID
    conta_bancaria_origem_id: UUID
    nome: str
    tipo: TipoAplicacaoFinanceira
    instituicao: Optional[str]
    numero_contrato: Optional[str]
    valor_aplicado: Decimal
    saldo_atual: Decimal
    rendimento_total: Decimal
    taxa_rendimento: Optional[Decimal]
    data_aplicacao: date
    data_vencimento: Optional[date]
    data_resgate: Optional[date]
    conta_contabil_aplicacao_id: UUID
    conta_contabil_receita_id: UUID
    conta_contabil_despesa_id: UUID
    status: StatusAplicacaoFinanceira
    observacoes: Optional[str]
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AplicacaoFinanceiraListRead(AplicacaoFinanceiraRead):
    """Versão estendida com nomes resolvidos para listagem."""
    conta_bancaria_nome: Optional[str] = None
    rendimento_percentual: Optional[Decimal] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# RendimentoAplicacao
# ---------------------------------------------------------------------------

class RendimentoCreate(BaseModel):
    data_rendimento: date
    valor_rendimento: Decimal = Field(..., gt=0)
    observacoes: Optional[str] = None

    class Config:
        from_attributes = True


class RendimentoRead(BaseModel):
    id: UUID
    aplicacao_id: UUID
    empresa_id: UUID
    data_rendimento: date
    valor_rendimento: Decimal
    saldo_antes: Decimal
    saldo_depois: Decimal
    observacoes: Optional[str]
    criado_em: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# ResgateAplicacao
# ---------------------------------------------------------------------------

class ResgateCreate(BaseModel):
    tipo: TipoResgate = TipoResgate.TOTAL
    data_resgate: date
    valor_bruto: Decimal = Field(..., gt=0)
    ir_retido: Decimal = Field(default=Decimal("0"), ge=0)
    iof_retido: Decimal = Field(default=Decimal("0"), ge=0)
    conta_bancaria_destino_id: UUID
    observacoes: Optional[str] = None

    @model_validator(mode="after")
    def compute_valor_liquido(self) -> "ResgateCreate":
        # computed at endpoint level; validation only
        return self

    class Config:
        from_attributes = True


class ResgateRead(BaseModel):
    id: UUID
    aplicacao_id: UUID
    empresa_id: UUID
    tipo: TipoResgate
    data_resgate: date
    valor_bruto: Decimal
    ir_retido: Decimal
    iof_retido: Decimal
    valor_liquido: Decimal
    conta_bancaria_destino_id: UUID
    observacoes: Optional[str]
    criado_em: datetime

    class Config:
        from_attributes = True
