from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime

from app.models.database import (
    StatusEmprestimo,
    TipoAmortizacao,
    TipoJuros,
    StatusParcela,
)


# --- Parcela ---

class ParcelaEmprestimoRead(BaseModel):
    id: UUID
    emprestimo_id: UUID
    empresa_id: UUID
    numero_parcela: int
    valor_principal: Decimal
    valor_juros: Decimal
    valor_total: Decimal
    valor_pago: Decimal
    data_vencimento: date
    data_pagamento: Optional[date] = None
    status: StatusParcela
    lancamento_id: Optional[UUID] = None
    usuario_liquidacao_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class PagarParcelaPayload(BaseModel):
    data_pagamento: date
    conta_bancaria_id: UUID
    valor_pago: Decimal = Field(..., gt=0)


# --- Emprestimo ---

class EmprestimoBase(BaseModel):
    parceiro_id: Optional[UUID] = None
    conta_bancaria_id: UUID
    conta_contabil_passivo_id: UUID
    conta_contabil_juros_id: UUID
    valor_contratado: Decimal = Field(..., gt=0)
    taxa_juros: Decimal = Field(..., ge=0)
    tipo_juros: TipoJuros = TipoJuros.COMPOSTO
    tipo_amortizacao: TipoAmortizacao = TipoAmortizacao.PRICE
    data_contratacao: date
    data_primeira_parcela: date
    numero_parcelas: int = Field(..., ge=1)
    periodicidade_dias: int = Field(default=30, ge=1)
    carencia_dias: int = Field(default=0, ge=0)
    descricao: Optional[str] = Field(None, max_length=255)
    numero_contrato: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "EmprestimoBase":
        if self.data_primeira_parcela < self.data_contratacao:
            raise ValueError("data_primeira_parcela não pode ser anterior à data_contratacao")
        return self


class EmprestimoCreate(EmprestimoBase):
    pass


class EmprestimoUpdate(BaseModel):
    descricao: Optional[str] = Field(None, max_length=255)
    numero_contrato: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None
    status: Optional[StatusEmprestimo] = None
    conta_contabil_passivo_id: Optional[UUID] = None
    conta_contabil_juros_id: Optional[UUID] = None


class EmprestimoRead(EmprestimoBase):
    id: UUID
    empresa_id: UUID
    saldo_devedor: Decimal
    data_vencimento_final: date
    status: StatusEmprestimo
    usuario_criacao_id: UUID
    criado_em: datetime
    atualizado_em: datetime
    parcelas: List[ParcelaEmprestimoRead] = []

    class Config:
        from_attributes = True


class EmprestimoListItem(BaseModel):
    id: UUID
    empresa_id: UUID
    descricao: Optional[str] = None
    numero_contrato: Optional[str] = None
    valor_contratado: Decimal
    saldo_devedor: Decimal
    taxa_juros: Decimal
    tipo_amortizacao: TipoAmortizacao
    data_contratacao: date
    data_vencimento_final: date
    numero_parcelas: int
    status: StatusEmprestimo
    parceiro_nome: Optional[str] = None

    class Config:
        from_attributes = True
