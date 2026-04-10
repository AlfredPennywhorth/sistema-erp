import httpx
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException

# Configuração de Logs
logger = logging.getLogger(__name__)

BASE_URL = "https://brasilapi.com.br/api"

class BrasilAPIService:
    """
    Serviço assíncrono para integração com BrasilAPI (CNPJ e CEP).
    """

    @staticmethod
    async def get_cnpj_info(cnpj: str) -> Dict[str, Any]:
        """
        Consulta informações fiscais de uma empresa via CNPJ.
        """
        # Limpar CNPJ (somente números)
        cnpj_clean = "".join(filter(str.isdigit, cnpj))
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{BASE_URL}/cnpj/v1/{cnpj_clean}", timeout=10.0)
                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail="CNPJ não encontrado na BrasilAPI")
                if response.status_code != 200:
                    logger.error(f"Erro BrasilAPI CNPJ ({response.status_code}): {response.text}")
                    raise HTTPException(status_code=response.status_code, detail="Erro ao consultar BrasilAPI")
                
                return response.json()
            except httpx.RequestError as exc:
                logger.error(f"Falha de conexão BrasilAPI CNPJ: {exc}")
                raise HTTPException(status_code=503, detail=f"Erro de conexão com BrasilAPI: {exc}")

    @staticmethod
    async def get_cep_info(cep: str) -> Dict[str, Any]:
        """
        Consulta informações de endereço via CEP.
        """
        # Limpar CEP (somente números)
        cep_clean = "".join(filter(str.isdigit, cep))
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{BASE_URL}/cep/v1/{cep_clean}", timeout=10.0)
                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail="CEP não encontrado")
                if response.status_code != 200:
                    logger.error(f"Erro BrasilAPI CEP ({response.status_code}): {response.text}")
                    raise HTTPException(status_code=response.status_code, detail="Erro ao consultar CEP na BrasilAPI")
                
                return response.json()
            except httpx.RequestError as exc:
                logger.error(f"Falha de conexão BrasilAPI CEP: {exc}")
                raise HTTPException(status_code=503, detail=f"Erro de conexão: {exc}")
