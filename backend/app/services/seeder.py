import json
import os
from typing import Dict, Any, List
from uuid import UUID
from sqlmodel import Session, select
from app.models.database import (
    PlanoConta, TipoConta, NaturezaConta, CentroCusto, FormaPagamento,
    BandeiraCartao, TipoFormaPagamento, TipoOperacaoPagamento
)

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
                ativo=True
            )
            session.add(cc)
        
        session.flush()

    @staticmethod
    def seed_formas_pagamento(session: Session, empresa_id: UUID) -> None:
        """
        Cria as formas de pagamento padrão para o tenant.
        Usa upsert por nome para não duplicar em re-execuções.
        """
        formas_padrao = [
            {
                "nome": "PIX",
                "tipo": TipoFormaPagamento.PIX,
                "tipo_operacao": TipoOperacaoPagamento.LIQUIDACAO_DIRETA,
                "baixa_imediata": True,
                "gera_obrigacao_futura": False,
                "prazo_liquidacao_dias": 0,
                "taxa_padrao": 0,
                "permite_parcelamento": False,
                "max_parcelas": 1,
            },
            {
                "nome": "Transferência Bancária",
                "tipo": TipoFormaPagamento.TRANSFERENCIA,
                "tipo_operacao": TipoOperacaoPagamento.LIQUIDACAO_DIRETA,
                "baixa_imediata": True,
                "gera_obrigacao_futura": False,
                "prazo_liquidacao_dias": 0,
                "taxa_padrao": 0,
                "permite_parcelamento": False,
                "max_parcelas": 1,
            },
            {
                "nome": "Boleto Bancário",
                "tipo": TipoFormaPagamento.BOLETO,
                "tipo_operacao": TipoOperacaoPagamento.COMPENSACAO_BOLETO,
                "baixa_imediata": False,
                "gera_obrigacao_futura": False,
                "prazo_liquidacao_dias": 2,
                "taxa_padrao": 0,
                "permite_parcelamento": False,
                "max_parcelas": 1,
            },
            {
                "nome": "Cartão de Débito",
                "tipo": TipoFormaPagamento.CARTAO_DEBITO,
                "tipo_operacao": TipoOperacaoPagamento.LIQUIDACAO_DIRETA,
                "baixa_imediata": True,
                "gera_obrigacao_futura": False,
                "prazo_liquidacao_dias": 1,
                "taxa_padrao": 0,
                "permite_parcelamento": False,
                "max_parcelas": 1,
            },
            {
                "nome": "Cartão de Crédito",
                "tipo": TipoFormaPagamento.CARTAO_CREDITO,
                "tipo_operacao": TipoOperacaoPagamento.GERACAO_FATURA,
                "baixa_imediata": False,
                "gera_obrigacao_futura": True,
                "prazo_liquidacao_dias": 30,
                "taxa_padrao": 0,
                "permite_parcelamento": True,
                "max_parcelas": 12,
            },
            {
                "nome": "Dinheiro",
                "tipo": TipoFormaPagamento.DINHEIRO,
                "tipo_operacao": TipoOperacaoPagamento.LIQUIDACAO_DIRETA,
                "baixa_imediata": True,
                "gera_obrigacao_futura": False,
                "prazo_liquidacao_dias": 0,
                "taxa_padrao": 0,
                "permite_parcelamento": False,
                "max_parcelas": 1,
            },
            {
                "nome": "Cheque",
                "tipo": TipoFormaPagamento.CHEQUE,
                "tipo_operacao": TipoOperacaoPagamento.LIQUIDACAO_DIFERIDA,
                "baixa_imediata": False,
                "gera_obrigacao_futura": False,
                "prazo_liquidacao_dias": 0,
                "taxa_padrao": 0,
                "permite_parcelamento": False,
                "max_parcelas": 1,
            },
        ]

        for item in formas_padrao:
            existente = session.exec(
                select(FormaPagamento).where(
                    FormaPagamento.empresa_id == empresa_id,
                    FormaPagamento.nome == item["nome"]
                )
            ).first()

            if not existente:
                forma = FormaPagamento(empresa_id=empresa_id, **item)
                session.add(forma)

        session.flush()

    @staticmethod
    def seed_bandeiras_cartao(session: Session, empresa_id: UUID) -> None:
        """
        Cria as bandeiras de cartão padrão para as formas de cartão de débito e crédito.
        Taxas são aproximações de mercado brasileiro (2026). Upsert por forma+nome.
        """
        formas_cartao = session.exec(
            select(FormaPagamento).where(
                FormaPagamento.empresa_id == empresa_id,
                FormaPagamento.tipo.in_([
                    TipoFormaPagamento.CARTAO_CREDITO,
                    TipoFormaPagamento.CARTAO_DEBITO
                ])
            )
        ).all()

        bandeiras_padrao = [
            {
                "nome": "Visa",
                "taxa_debito": "1.25",
                "taxa_credito_1x": "2.69",
                "taxa_credito_2_6x": "3.09",
                "taxa_credito_7_12x": "3.49",
                "prazo_repasse_dias": 30,
            },
            {
                "nome": "Mastercard",
                "taxa_debito": "1.25",
                "taxa_credito_1x": "2.69",
                "taxa_credito_2_6x": "3.09",
                "taxa_credito_7_12x": "3.49",
                "prazo_repasse_dias": 30,
            },
            {
                "nome": "Elo",
                "taxa_debito": "1.35",
                "taxa_credito_1x": "2.79",
                "taxa_credito_2_6x": "3.19",
                "taxa_credito_7_12x": "3.59",
                "prazo_repasse_dias": 30,
            },
            {
                "nome": "American Express",
                "taxa_debito": "0.00",
                "taxa_credito_1x": "3.09",
                "taxa_credito_2_6x": "3.49",
                "taxa_credito_7_12x": "3.89",
                "prazo_repasse_dias": 30,
            },
            {
                "nome": "Hipercard",
                "taxa_debito": "1.40",
                "taxa_credito_1x": "2.99",
                "taxa_credito_2_6x": "3.39",
                "taxa_credito_7_12x": "3.79",
                "prazo_repasse_dias": 30,
            },
        ]

        if not formas_cartao:
            return

        forma_ids = [str(f.id) for f in formas_cartao]

        # Buscar todas as bandeiras existentes para as formas de cartão de uma só vez
        bandeiras_existentes = session.exec(
            select(BandeiraCartao).where(
                BandeiraCartao.empresa_id == empresa_id,
                BandeiraCartao.forma_pagamento_id.in_(forma_ids)
            )
        ).all()
        chaves_existentes = {(str(b.forma_pagamento_id), b.nome) for b in bandeiras_existentes}

        for forma in formas_cartao:
            for item in bandeiras_padrao:
                # American Express não tem modalidade débito
                if forma.tipo == TipoFormaPagamento.CARTAO_DEBITO and item["nome"] == "American Express":
                    continue

                if (str(forma.id), item["nome"]) not in chaves_existentes:
                    bandeira = BandeiraCartao(
                        empresa_id=empresa_id,
                        forma_pagamento_id=forma.id,
                        **item
                    )
                    session.add(bandeira)

        session.flush()
