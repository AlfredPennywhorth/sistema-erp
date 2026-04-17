from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class TipoPessoa(str, Enum):
    PF = "PF"
    PJ = "PJ"

class ContatoBase(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    cargo: Optional[str] = None
    is_principal: bool = False

class ContatoCreate(ContatoBase):
    pass

class ContatoRead(ContatoBase):
    id: UUID
    parceiro_id: UUID
    criado_em: datetime

    class Config:
        from_attributes = True

class ParceiroBase(BaseModel):
    tipo_pessoa: TipoPessoa = TipoPessoa.PJ
    nome_razao: str
    nome_fantasia: Optional[str] = None
    cpf_cnpj: str
    is_cliente: bool = True
    is_fornecedor: bool = False
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    
    # Endereço
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    
    # Financeiro
    conta_padrao_id: Optional[UUID] = None
    observacoes: Optional[str] = None
    is_active: bool = True

class ParceiroCreate(ParceiroBase):
    contatos: Optional[list[ContatoCreate]] = []

class ParceiroUpdate(BaseModel):
    tipo_pessoa: Optional[TipoPessoa] = None
    nome_razao: Optional[str] = None
    nome_fantasia: Optional[str] = None
    is_cliente: Optional[bool] = None
    is_fornecedor: Optional[bool] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    conta_padrao_id: Optional[UUID] = None
    observacoes: Optional[str] = None
    is_active: Optional[bool] = None

class ParceiroRead(ParceiroBase):
    id: UUID
    empresa_id: UUID
    criado_em: datetime
    atualizado_em: datetime
    contatos: list[ContatoRead] = []

    class Config:
        from_attributes = True
