from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from app.models.database import (
    NaturezaFinanceira, TipoLancamento, StatusLancamento, TipoEventoContabil,
    TipoContaBancaria, TipoFormaPagamento, TipoOperacaoPagamento, StatusFatura,
    NaturezaConta, TipoConta, TipoCentroCusto,
)

# --- Banco ---
class BancoBase(BaseModel):
    codigo_bacen: str = Field(..., max_length=10)
    nome: str = Field(..., max_length=255)

class BancoCreate(BancoBase):
    pass

class BancoRead(BancoBase):
    id: UUID
    class Config:
        from_attributes = True

# --- ContaBancaria ---
class ContaBancariaBase(BaseModel):
    banco_id: UUID
    nome: str = Field(..., max_length=100)
    agencia: str = Field(..., max_length=20)
    conta: str = Field(..., max_length=20)
    tipo_conta: TipoContaBancaria = TipoContaBancaria.CORRENTE
    saldo_inicial: Decimal = Field(default=0, max_digits=18, decimal_places=2)
    limite_credito: Decimal = Field(default=0, max_digits=18, decimal_places=2)
    conta_contabil_id: Optional[UUID] = None

class ContaBancariaCreate(ContaBancariaBase):
    conta_contabil_id: UUID  # Required on creation per business rule

class ContaBancariaUpdate(BaseModel):
    banco_id: Optional[UUID] = None
    nome: Optional[str] = Field(None, max_length=100)
    agencia: Optional[str] = Field(None, max_length=20)
    conta: Optional[str] = Field(None, max_length=20)
    tipo_conta: Optional[TipoContaBancaria] = None
    saldo_inicial: Optional[Decimal] = Field(None, max_digits=18, decimal_places=2)
    limite_credito: Optional[Decimal] = Field(None, max_digits=18, decimal_places=2)
    conta_contabil_id: Optional[UUID] = None
    ativo: Optional[bool] = None

class ContaBancariaRead(ContaBancariaBase):
    id: UUID
    empresa_id: UUID
    saldo_atual: Decimal
    saldo_disponivel: Optional[Decimal] = None
    conta_contabil_nome: Optional[str] = None
    ativo: bool = True
    criado_em: datetime
    class Config:
        from_attributes = True

# --- PlanoConta ---
class PlanoContaBase(BaseModel):
    codigo_estruturado: str = Field(..., max_length=50)
    nome: str = Field(..., max_length=100)
    tipo: TipoConta
    natureza: NaturezaConta
    is_analitica: bool = True
    parent_id: Optional[UUID] = None

class PlanoContaCreate(PlanoContaBase):
    pass

class PlanoContaUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    tipo: Optional[TipoConta] = None
    natureza: Optional[NaturezaConta] = None
    is_analitica: Optional[bool] = None
    ativo: Optional[bool] = None
    parent_id: Optional[UUID] = None

class PlanoContaRead(PlanoContaBase):
    id: UUID
    empresa_id: UUID
    ativo: bool
    class Config:
        from_attributes = True

# --- CentroCusto ---
class CentroCustoBase(BaseModel):
    codigo: str = Field(..., max_length=50)
    nome: str = Field(..., max_length=100)
    descricao: Optional[str] = Field(None, max_length=255)
    tipo: TipoCentroCusto = TipoCentroCusto.ANALITICO
    ativo: bool = True
    parent_id: Optional[UUID] = None

class CentroCustoCreate(CentroCustoBase):
    pass

class CentroCustoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=50)
    nome: Optional[str] = Field(None, max_length=100)
    descricao: Optional[str] = Field(None, max_length=255)
    tipo: Optional[TipoCentroCusto] = None
    ativo: Optional[bool] = None
    parent_id: Optional[UUID] = None

class CentroCustoRead(CentroCustoBase):
    id: UUID
    empresa_id: UUID
    criado_em: datetime
    atualizado_em: datetime
    class Config:
        from_attributes = True

# --- FormaPagamento ---
class FormaPagamentoBase(BaseModel):
    nome: str = Field(..., max_length=100)
    taxa_padrao: Decimal = Field(default=0, max_digits=5, decimal_places=2)
    is_active: bool = True
    tipo: Optional[TipoFormaPagamento] = None
    tipo_operacao: TipoOperacaoPagamento = TipoOperacaoPagamento.LIQUIDACAO_DIRETA
    baixa_imediata: bool = True
    gera_obrigacao_futura: bool = False
    prazo_liquidacao_dias: int = 0
    permite_parcelamento: bool = False
    max_parcelas: int = 1
    conta_transitoria_id: Optional[UUID] = None
    dia_fechamento: Optional[int] = Field(None, ge=1, le=31)
    dia_vencimento: Optional[int] = Field(None, ge=1, le=31)

class FormaPagamentoCreate(FormaPagamentoBase):
    pass

class FormaPagamentoUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    taxa_padrao: Optional[Decimal] = Field(None, max_digits=5, decimal_places=2)
    is_active: Optional[bool] = None
    tipo: Optional[TipoFormaPagamento] = None
    tipo_operacao: Optional[TipoOperacaoPagamento] = None
    baixa_imediata: Optional[bool] = None
    gera_obrigacao_futura: Optional[bool] = None
    prazo_liquidacao_dias: Optional[int] = None
    permite_parcelamento: Optional[bool] = None
    max_parcelas: Optional[int] = None
    conta_transitoria_id: Optional[UUID] = None
    dia_fechamento: Optional[int] = Field(None, ge=1, le=31)
    dia_vencimento: Optional[int] = Field(None, ge=1, le=31)

class FormaPagamentoRead(FormaPagamentoBase):
    id: UUID
    empresa_id: UUID
    class Config:
        from_attributes = True

# --- FaturaCartao ---
class FaturaCartaoBase(BaseModel):
    forma_pagamento_id: UUID
    mes_referencia: date
    data_vencimento: date
    data_fechamento: date

class FaturaCartaoCreate(FaturaCartaoBase):
    pass

class FaturaCartaoRead(FaturaCartaoBase):
    id: UUID
    empresa_id: UUID
    valor_total: Decimal
    status: StatusFatura
    lancamento_pagamento_id: Optional[UUID] = None
    criado_em: datetime
    class Config:
        from_attributes = True

class PagarFaturaPayload(BaseModel):
    conta_bancaria_id: UUID
    data_pagamento: date
    desconto: Optional[Decimal] = Decimal('0')

# --- BandeiraCartao ---
class BandeiraCartaoBase(BaseModel):
    forma_pagamento_id: UUID
    nome: str = Field(..., max_length=50)
    taxa_debito: Decimal = Field(default=0, max_digits=6, decimal_places=4)
    taxa_credito_1x: Decimal = Field(default=0, max_digits=6, decimal_places=4)
    taxa_credito_2_6x: Decimal = Field(default=0, max_digits=6, decimal_places=4)
    taxa_credito_7_12x: Decimal = Field(default=0, max_digits=6, decimal_places=4)
    prazo_repasse_dias: int = 30
    is_active: bool = True

class BandeiraCartaoCreate(BandeiraCartaoBase):
    pass

class BandeiraCartaoUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=50)
    taxa_debito: Optional[Decimal] = Field(None, max_digits=6, decimal_places=4)
    taxa_credito_1x: Optional[Decimal] = Field(None, max_digits=6, decimal_places=4)
    taxa_credito_2_6x: Optional[Decimal] = Field(None, max_digits=6, decimal_places=4)
    taxa_credito_7_12x: Optional[Decimal] = Field(None, max_digits=6, decimal_places=4)
    prazo_repasse_dias: Optional[int] = None
    is_active: Optional[bool] = None

class BandeiraCartaoRead(BandeiraCartaoBase):
    id: UUID
    empresa_id: UUID
    class Config:
        from_attributes = True
# --- Extrato ---
class ExtratoRead(BaseModel):
    id: UUID
    descricao: str
    natureza: NaturezaFinanceira
    valor_pago: Optional[Decimal] = Decimal('0')
    data_pagamento: Optional[date] = None
    conta_nome: Optional[str] = None
    categoria_nome: Optional[str] = None
    parceiro_nome: Optional[str] = None
    documento: Optional[str] = None

    class Config:
        from_attributes = True

class ExtratoPaginatedRead(BaseModel):
    items: List[ExtratoRead]
    total: int
    page: int
    size: int
    pages: int

class LancamentoUpdate(BaseModel):
    descricao: Optional[str] = None
    plano_contas_id: Optional[UUID] = None
    conta_bancaria_id: Optional[UUID] = None
    data_pagamento: Optional[date] = None
    valor_pago: Optional[Decimal] = None
    documento: Optional[str] = None

    class Config:
        from_attributes = True

class LancamentoCreate(BaseModel):
    descricao: str = Field(..., max_length=255)
    valor_previsto: Decimal = Field(default=0)
    data_vencimento: date
    natureza: NaturezaFinanceira
    tipo: TipoLancamento = TipoLancamento.PROVISAO
    
    # Campo novo para automação
    tipo_evento: Optional[TipoEventoContabil] = None
    
    # Campos originais (fallback)
    plano_contas_id: Optional[UUID] = None
    parceiro_id: Optional[UUID] = None
    centro_custo_id: Optional[UUID] = None
    conta_bancaria_id: Optional[UUID] = None
    forma_pagamento_id: Optional[UUID] = None
    
    # Outros campos
    documento: Optional[str] = None
    observacoes: Optional[str] = None
    data_competencia: Optional[date] = None
    data_pagamento: Optional[date] = None
    valor_pago: Optional[Decimal] = Decimal('0')

    class Config:
        from_attributes = True
