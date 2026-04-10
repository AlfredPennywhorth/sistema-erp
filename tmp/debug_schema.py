import sys
import os
sys.path.append(os.getcwd())

from app.schemas.tenants import TenantSetupSchema
from pydantic import ValidationError

payload = {
    "cnpj": "12.345.678/0001-95",
    "usuario_id": "00000000-0000-0000-0000-000000000000",
    "email": "mock@exemplo.com",
    "razao_social": "Empresa Teste",
    "regime_tributario": "SIMPLES_NACIONAL",
    "cep": "00000-000",
    "logradouro": "temp",
    "numero": "0",
    "bairro": "temp",
    "cidade": "temp",
    "uf": "SP",
    "aceite_termos": False
}

try:
    obj = TenantSetupSchema(**payload)
    print("Sucesso! Payload é válido para o Pydantic.")
    print(obj.dict())
except ValidationError as e:
    print("ERRO DE VALIDAÇÃO:")
    print(e.json(indent=2))
