import json
import os
from typing import Dict, Any, List
from uuid import UUID
from sqlmodel import Session
from app.models.database import PlanoConta, TipoConta, NaturezaConta, CentroCusto

class SeederService:
    @staticmethod
    def _read_plano_contas_json() -> Dict[str, List[Dict[str, Any]]]:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(current_dir, "..", "seeds", "plano_contas.json")
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def seed_plano_contas(session: Session, empresa_id: UUID, segmento: str = "servicos") -> None:
        """
        Semeia a tabela plano_contas para uma nova empresa, usando as normas do CFC.
        O json base mescla contas comuns a todos os regimes com contas específicas
        do segmento escolhido.
        """
        data = SeederService._read_plano_contas_json()
        
        # Fallback de segurança para serviços
        if segmento not in ["servicos", "comercio", "industria"]:
            segmento = "servicos"
            
        contas_para_inserir = data.get("comum", []) + data.get(segmento, [])
        
        # Ordenar os códigos estruturados para garantir que estruturas primárias (1)
        # sejam inseridas antes de sub-estruturas (1.1, 1.1.01) para montagem do parent_id.
        contas_para_inserir.sort(key=lambda x: x["codigo"])

        # Cache Map de (codigo_estruturado -> UUID gerado) no PostgreSQL
        codigo_to_id_map = {}

        for item in contas_para_inserir:
            
            # Parsing para Enum
            tipo_enum = TipoConta(item["tipo"])
            natureza_enum = NaturezaConta(item["natureza"])
            
            # Descobrindo o parent_id por meio da quebra do código estruturado
            parent_id = None
            if "." in item["codigo"]:
                parent_codigo = ".".join(item["codigo"].split(".")[:-1])
                parent_id = codigo_to_id_map.get(parent_codigo)
                
            nova_conta = PlanoConta(
                empresa_id=empresa_id,
                codigo_estruturado=item["codigo"],
                nome=item["nome"],
                tipo=tipo_enum,
                natureza=natureza_enum,
                is_analitica=item["is_analitica"],
                parent_id=parent_id
            )
            session.add(nova_conta)
            session.flush() # Gerar o ID da linha atual (necessário para os filhos)
            codigo_to_id_map[item["codigo"]] = nova_conta.id

    @staticmethod
    def seed_centros_custo(session: Session, empresa_id: UUID) -> None:
        """
        Cria os centros de custo iniciais para o tenant.
        """
        centros = [
            {"codigo": "100", "nome": "Administrativo"},
            {"codigo": "200", "nome": "Operacional"},
            {"codigo": "300", "nome": "Comercial"}
        ]
        
        for item in centros:
            cc = CentroCusto(
                empresa_id=empresa_id,
                codigo=item["codigo"],
                nome=item["nome"],
                is_active=True
            )
            session.add(cc)
        
        session.flush()
