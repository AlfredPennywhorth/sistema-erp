from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.database import (
    AtividadeEconomica,
    StatusLoteContabil,
    TipoConta,
    NaturezaConta,
)


# --- Templates ---

class ModeloPlanoContaItemRead(BaseModel):
    id: UUID
    modelo_id: UUID
    codigo_estruturado: str
    nome: str
    tipo: TipoConta
    natureza: NaturezaConta
    is_analitica: bool
    parent_codigo: Optional[str] = None
    is_required: bool
    class Config:
        from_attributes = True

class ModeloPlanoContaRead(BaseModel):
    id: UUID
    codigo: str
    nome: str
    atividade_economica: AtividadeEconomica
    versao: int
    descricao: Optional[str] = None
    ativo: bool
    total_contas: Optional[int] = None
    class Config:
        from_attributes = True

class ModeloPlanoContaDetailRead(ModeloPlanoContaRead):
    itens: List[ModeloPlanoContaItemRead] = []


# --- Ativação do módulo ---

class AtivarModuloPayload(BaseModel):
    atividade_economica: AtividadeEconomica
    modelo_id: Optional[UUID] = None  # Se não fornecido, usa o template padrão da atividade

class AtivarModuloResponse(BaseModel):
    message: str
    modelo_codigo: str
    modelo_versao: int
    contas_criadas: int


# --- Lotes Contábeis ---

class PartidaCreate(BaseModel):
    conta_id: UUID
    valor: Decimal = Field(..., gt=0, max_digits=18, decimal_places=2)
    debito_credito: str = Field(..., pattern="^[DC]$")

class LancamentoContabilCreate(BaseModel):
    data: date
    historico: str = Field(..., max_length=500)
    documento_referencia: Optional[str] = Field(None, max_length=100)
    partidas: List[PartidaCreate] = Field(..., min_length=2)

class LoteContabilRead(BaseModel):
    id: UUID
    empresa_id: UUID
    data_lancamento: date
    historico: str
    documento_referencia: Optional[str] = None
    modulo_origem: str
    lancamento_financeiro_id: Optional[UUID] = None
    usuario_id: Optional[UUID] = None
    status: StatusLoteContabil
    criado_em: datetime
    class Config:
        from_attributes = True

class PartidaRead(BaseModel):
    id: UUID
    conta_id: UUID
    conta_nome: Optional[str] = None
    conta_codigo: Optional[str] = None
    valor: Decimal
    debito_credito: str
    historico: Optional[str] = None
    class Config:
        from_attributes = True

class LoteContabilDetailRead(LoteContabilRead):
    partidas: List[PartidaRead] = []


# --- Livro Razão ---

class RazaoMovimento(BaseModel):
    data: date
    historico: Optional[str] = None
    debito: Decimal
    credito: Decimal
    saldo: Decimal
    lote_id: Optional[UUID] = None
    modulo_origem: str

class RazaoRead(BaseModel):
    conta_id: UUID
    conta_nome: str
    conta_codigo: str
    natureza: NaturezaConta
    saldo_anterior: Decimal
    total_debitos: Decimal
    total_creditos: Decimal
    saldo_final: Decimal
    movimentos: List[RazaoMovimento] = []


# --- Balancete ---

class BalanceteItem(BaseModel):
    conta_id: UUID
    codigo: str
    nome: str
    tipo: TipoConta
    natureza: NaturezaConta
    saldo_anterior: Decimal
    total_debitos: Decimal
    total_creditos: Decimal
    saldo_atual: Decimal

class BalanceteRead(BaseModel):
    data_inicio: date
    data_fim: date
    itens: List[BalanceteItem] = []
    total_debitos: Decimal
    total_creditos: Decimal


# --- DRE ---

class DREItem(BaseModel):
    conta_id: UUID
    codigo: str
    nome: str
    tipo: TipoConta
    valor: Decimal  # positivo = receita, negativo = despesa

class DRERead(BaseModel):
    data_inicio: date
    data_fim: date
    total_receitas: Decimal
    total_despesas: Decimal
    resultado_liquido: Decimal
    itens: List[DREItem] = []


# --- Balanço ---

class BalancoItem(BaseModel):
    conta_id: UUID
    codigo: str
    nome: str
    tipo: TipoConta
    saldo: Decimal
    nivel: int  # profundidade hierárquica
    filhos: List["BalancoItem"] = []

BalancoItem.model_rebuild()

class BalancoRead(BaseModel):
    data_base: date
    total_ativo: Decimal
    total_passivo: Decimal
    total_patrimonio: Decimal
    ativo: List[BalancoItem] = []
    passivo: List[BalancoItem] = []
    patrimonio: List[BalancoItem] = []
