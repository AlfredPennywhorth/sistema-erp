from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from enum import Enum
from decimal import Decimal
from datetime import datetime

# Enums (replicados dos models para typing ou importados)
class NaturezaConta(str, Enum):
    DEVEDORA = "DEVEDORA"
    CREDORA = "CREDORA"

class TipoConta(str, Enum):
    ATIVO = "ATIVO"
    PASSIVO = "PASSIVO"
    RECEITA = "RECEITA"
    DESPESA = "DESPESA"
    PATRIMONIO = "PATRIMONIO"

class TipoCentroCusto(str, Enum):
    SINTETICO = "SINTETICO"
    ANALITICO = "ANALITICO"

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
    saldo_inicial: Decimal = Field(default=0, max_digits=18, decimal_places=2)

class ContaBancariaCreate(ContaBancariaBase):
    pass

class ContaBancariaUpdate(BaseModel):
    banco_id: Optional[UUID] = None
    nome: Optional[str] = Field(None, max_length=100)
    agencia: Optional[str] = Field(None, max_length=20)
    conta: Optional[str] = Field(None, max_length=20)
    saldo_inicial: Optional[Decimal] = Field(None, max_digits=18, decimal_places=2)

class ContaBancariaRead(ContaBancariaBase):
    id: UUID
    empresa_id: UUID
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
    tipo: TipoCentroCusto = TipoCentroCusto.ANALITICO
    is_active: bool = True
    parent_id: Optional[UUID] = None

class CentroCustoCreate(CentroCustoBase):
    pass

class CentroCustoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=50)
    nome: Optional[str] = Field(None, max_length=100)
    tipo: Optional[TipoCentroCusto] = None
    is_active: Optional[bool] = None
    parent_id: Optional[UUID] = None

class CentroCustoRead(CentroCustoBase):
    id: UUID
    empresa_id: UUID
    class Config:
        from_attributes = True

# --- FormaPagamento ---
class FormaPagamentoBase(BaseModel):
    nome: str = Field(..., max_length=100)
    taxa_padrao: Decimal = Field(default=0, max_digits=5, decimal_places=2)
    is_active: bool = True

class FormaPagamentoCreate(FormaPagamentoBase):
    pass

class FormaPagamentoRead(FormaPagamentoBase):
    id: UUID
    empresa_id: UUID
    class Config:
        from_attributes = True
