from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from app.models.database import StatusPagamento, RegimeTributario


# --- Empresa (read model enxuto para o portal do contador) ---

class EmpresaContadorRead(BaseModel):
    id: UUID
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: str
    regime_tributario: RegimeTributario
    classificacao_fiscal: Optional[RegimeTributario] = None

    class Config:
        from_attributes = True


# --- Troca de Contexto ---

class SwitchContextPayload(BaseModel):
    empresa_id: UUID


# --- Honorários ---

class HonorariosContadorCreate(BaseModel):
    empresa_id: UUID
    valor: Decimal
    data_vencimento: date
    observacoes: Optional[str] = None


class HonorariosContadorRead(BaseModel):
    id: UUID
    usuario_id: UUID
    empresa_id: UUID
    valor: Decimal
    data_vencimento: date
    status_pagamento: StatusPagamento
    observacoes: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True


# --- Pendências por Empresa ---

class PendenciasEmpresaRead(BaseModel):
    empresa_id: UUID
    lancamentos_abertos: int
    contas_sem_vinculo_contabil: int
    total_regras_contabeis: int
