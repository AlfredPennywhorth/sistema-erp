from pydantic import BaseModel, Field, validator
from typing import Optional, List
from uuid import UUID
from enum import Enum

class RegimeTributario(str, Enum):
    SIMPLES_NACIONAL = "SIMPLES_NACIONAL"
    LUCRO_PRESUMIDO = "LUCRO_PRESUMIDO"
    LUCRO_REAL = "LUCRO_REAL"
    MEI = "MEI"

class TenantSetupSchema(BaseModel):
    """
    Schema para o setup inicial da empresa (Step 1 a 3).
    """
    cnpj: str = Field(..., min_length=14, max_length=18, description="CNPJ da empresa")
    usuario_id: UUID = Field(..., description="ID do usuário administrador logado")
    email: Optional[str] = Field(default=None, max_length=255, description="E-mail do administrador")
    
    # Dados Fiscais/Endereço (Caso a BrasilAPI falhe ou para campos manuais)
    razao_social: Optional[str] = Field(default=None, max_length=255)
    nome_fantasia: Optional[str] = Field(default=None, max_length=255)
    inscricao_estadual: Optional[str] = Field(default=None, max_length=20)
    regime_tributario: RegimeTributario = RegimeTributario.SIMPLES_NACIONAL
    
    cep: str = Field(..., min_length=8, max_length=9)
    logradouro: str = Field(..., max_length=255)
    numero: str = Field(..., max_length=20)
    complemento: Optional[str] = Field(default=None, max_length=100)
    bairro: str = Field(..., max_length=100)
    cidade: str = Field(..., max_length=100)
    uf: str = Field(..., min_length=2, max_length=2)
    
    # Compliance
    aceite_termos: bool = Field(..., description="Aceite dos termos para conformidade LGPD")

    @validator("cnpj")
    def validate_cnpj(cls, v):
        # Limpar CNPJ
        clean_v = "".join(filter(str.isdigit, v))
        if len(clean_v) != 14:
            raise ValueError("CNPJ deve conter exatamente 14 dígitos numéricos")
        return clean_v

    @validator("cep")
    def validate_cep(cls, v):
        # Limpar CEP
        clean_v = "".join(filter(str.isdigit, v))
        if len(clean_v) != 8:
            raise ValueError("CEP deve conter exatamente 8 dígitos numéricos")
        return clean_v
