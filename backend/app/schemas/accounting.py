from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.models.database import TipoEventoContabil, NaturezaFinanceira

class RegraContabilBase(BaseModel):
    tipo_evento: TipoEventoContabil
    natureza: NaturezaFinanceira
    conta_debito_id: UUID
    conta_credito_id: UUID
    historico_padrao: Optional[str] = None
    ativo: bool = True

class RegraContabilCreate(RegraContabilBase):
    pass

class RegraContabilUpdate(BaseModel):
    tipo_evento: Optional[TipoEventoContabil] = None
    natureza: Optional[NaturezaFinanceira] = None
    conta_debito_id: Optional[UUID] = None
    conta_credito_id: Optional[UUID] = None
    historico_padrao: Optional[str] = None
    ativo: Optional[bool] = None

class RegraContabilRead(RegraContabilBase):
    id: UUID
    empresa_id: UUID
    # Adicionais para facilitar o frontend (nomes das contas)
    nome_conta_debito: Optional[str] = None
    nome_conta_credito: Optional[str] = None

    class Config:
        from_attributes = True
