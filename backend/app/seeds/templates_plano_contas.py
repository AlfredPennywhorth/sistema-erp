"""
Seeder de Templates de Plano de Contas

Popula os templates padrão separados por atividade econômica:
- SERVICOS, COMERCIO, INDUSTRIA, AGRICULTURA

Executar: python -m app.seeds.templates_plano_contas
Ou chamar: seed_templates(session) em scripts de setup.

Templates são IMUTÁVEIS após publicação — use nova versão para alterar.
"""
import logging
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session, select

from app.models.database import AtividadeEconomica, ModeloPlanoConta, ModeloPlanoContaItem, TipoConta, NaturezaConta

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Contas Comuns a todos os templates (grupo 1 — Ativo e grupo 2 — Passivo base)
# ---------------------------------------------------------------------------

_CONTAS_COMUNS = [
    # ATIVO
    {"codigo": "1", "nome": "ATIVO", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "is_required": True},
    {"codigo": "1.1", "nome": "ATIVO CIRCULANTE", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "parent": "1", "is_required": True},
    {"codigo": "1.1.01", "nome": "Caixa", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.02", "nome": "Bancos Conta Movimento", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.03", "nome": "Aplicações Financeiras de Curto Prazo", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": False},
    {"codigo": "1.1.04", "nome": "Clientes / Contas a Receber", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.05", "nome": "Adiantamentos a Fornecedores", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "parent": "1.1", "is_required": False},
    {"codigo": "1.1.06", "nome": "Tributos a Recuperar", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": False},
    {"codigo": "1.2", "nome": "ATIVO NÃO CIRCULANTE", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "parent": "1", "is_required": False},
    {"codigo": "1.2.01", "nome": "Imobilizado", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "parent": "1.2", "is_required": False},
    {"codigo": "1.2.01.01", "nome": "Móveis e Utensílios", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.2.01", "is_required": False},
    {"codigo": "1.2.01.02", "nome": "Equipamentos de Informática", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.2.01", "is_required": False},
    {"codigo": "1.2.01.03", "nome": "Veículos", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.2.01", "is_required": False},
    {"codigo": "1.2.02", "nome": "Depreciação Acumulada", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "1.2", "is_required": False},
    {"codigo": "1.2.03", "nome": "Intangível", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.2", "is_required": False},
    # PASSIVO
    {"codigo": "2", "nome": "PASSIVO", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "is_required": True},
    {"codigo": "2.1", "nome": "PASSIVO CIRCULANTE", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "2", "is_required": True},
    {"codigo": "2.1.01", "nome": "Fornecedores / Contas a Pagar", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.1", "is_required": True},
    {"codigo": "2.1.02", "nome": "Salários e Encargos a Pagar", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.1", "is_required": False},
    {"codigo": "2.1.03", "nome": "Tributos a Pagar", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "2.1", "is_required": False},
    {"codigo": "2.1.03.01", "nome": "IRPJ a Pagar", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.1.03", "is_required": False},
    {"codigo": "2.1.03.02", "nome": "CSLL a Pagar", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.1.03", "is_required": False},
    {"codigo": "2.1.03.03", "nome": "PIS/COFINS a Pagar", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.1.03", "is_required": False},
    {"codigo": "2.1.04", "nome": "Empréstimos e Financiamentos CP", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.1", "is_required": True},
    {"codigo": "2.2", "nome": "PASSIVO NÃO CIRCULANTE", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "2", "is_required": False},
    {"codigo": "2.2.01", "nome": "Empréstimos e Financiamentos LP", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.2", "is_required": True},
    # PATRIMÔNIO
    {"codigo": "3", "nome": "PATRIMÔNIO LÍQUIDO", "tipo": TipoConta.PATRIMONIO, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "is_required": True},
    {"codigo": "3.1", "nome": "Capital Social", "tipo": TipoConta.PATRIMONIO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "3", "is_required": True},
    {"codigo": "3.2", "nome": "Reservas de Capital", "tipo": TipoConta.PATRIMONIO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "3", "is_required": False},
    {"codigo": "3.3", "nome": "Lucros / Prejuízos Acumulados", "tipo": TipoConta.PATRIMONIO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "3", "is_required": True},
    # DESPESAS comuns
    {"codigo": "4", "nome": "DESPESAS", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "is_required": True},
    {"codigo": "4.1", "nome": "DESPESAS OPERACIONAIS", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "parent": "4", "is_required": True},
    {"codigo": "4.1.01", "nome": "Folha de Pagamento", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.02", "nome": "Encargos Sociais (INSS/FGTS)", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.03", "nome": "Aluguel", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.04", "nome": "Energia Elétrica / Utilidades", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.05", "nome": "Comunicação e TI", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.06", "nome": "Depreciação e Amortização", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.2", "nome": "DESPESAS FINANCEIRAS", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "parent": "4", "is_required": True},
    {"codigo": "4.2.01", "nome": "Juros Passivos sobre Empréstimos", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.2", "is_required": True},
    {"codigo": "4.2.02", "nome": "Tarifas Bancárias", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.2", "is_required": False},
    {"codigo": "4.2.03", "nome": "IOF / IR sobre Aplicações", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.2", "is_required": False},
    {"codigo": "4.3", "nome": "IMPOSTOS E CONTRIBUIÇÕES", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": False, "parent": "4", "is_required": False},
    {"codigo": "4.3.01", "nome": "IRPJ e CSLL", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.3", "is_required": False},
    {"codigo": "4.3.02", "nome": "Simples Nacional / DAS", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.3", "is_required": False},
    # RECEITAS comuns
    {"codigo": "5", "nome": "RECEITAS", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "is_required": True},
    {"codigo": "5.2", "nome": "RECEITAS FINANCEIRAS", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "5", "is_required": True},
    {"codigo": "5.2.01", "nome": "Rendimentos sobre Aplicações Financeiras", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.2", "is_required": True},
    {"codigo": "5.2.02", "nome": "Juros Ativos / Mora Recebida", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.2", "is_required": False},
    {"codigo": "5.3", "nome": "OUTRAS RECEITAS OPERACIONAIS", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "5", "is_required": False},
    {"codigo": "5.3.01", "nome": "Outras Receitas", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.3", "is_required": False},
]

# ---------------------------------------------------------------------------
# Contas específicas por atividade econômica
# ---------------------------------------------------------------------------

_CONTAS_SERVICOS = [
    {"codigo": "1.1.07", "nome": "Adiantamentos a Empregados", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": False},
    {"codigo": "5.1", "nome": "RECEITAS DE SERVIÇOS", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "5", "is_required": True},
    {"codigo": "5.1.01", "nome": "Receitas de Prestação de Serviços", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.1", "is_required": True},
    {"codigo": "5.1.02", "nome": "Receitas de Consultoria", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.1", "is_required": False},
    {"codigo": "4.1.07", "nome": "ISS a Pagar", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.08", "nome": "PIS/COFINS sobre Serviços", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.09", "nome": "Materiais de Consumo / Insumos", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
]

_CONTAS_COMERCIO = [
    {"codigo": "1.1.08", "nome": "Estoques de Mercadorias", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.09", "nome": "ICMS a Recuperar", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": False},
    {"codigo": "5.1", "nome": "RECEITAS DE VENDAS", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "5", "is_required": True},
    {"codigo": "5.1.01", "nome": "Receitas de Vendas de Mercadorias", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.1", "is_required": True},
    {"codigo": "5.1.02", "nome": "Devoluções de Vendas (Dedutor)", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "5.1", "is_required": False},
    {"codigo": "4.1.07", "nome": "Custo das Mercadorias Vendidas (CMV)", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": True},
    {"codigo": "4.1.08", "nome": "ICMS sobre Vendas", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.09", "nome": "PIS/COFINS sobre Vendas", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.10", "nome": "Fretes sobre Vendas", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
]

_CONTAS_INDUSTRIA = [
    {"codigo": "1.1.08", "nome": "Estoques de Matéria-Prima", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.09", "nome": "Produtos em Elaboração", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.10", "nome": "Produtos Acabados", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.11", "nome": "IPI a Recuperar", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": False},
    {"codigo": "1.2.04", "nome": "CIAP — Crédito de ICMS s/ Ativo Permanente", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.2", "is_required": False},
    {"codigo": "5.1", "nome": "RECEITAS INDUSTRIAIS", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "5", "is_required": True},
    {"codigo": "5.1.01", "nome": "Receitas de Vendas de Produtos", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.1", "is_required": True},
    {"codigo": "5.1.02", "nome": "Devoluções de Vendas (Dedutor)", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "5.1", "is_required": False},
    {"codigo": "4.1.07", "nome": "Custo dos Produtos Vendidos (CPV)", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": True},
    {"codigo": "4.1.08", "nome": "Matéria-Prima Consumida", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": True},
    {"codigo": "4.1.09", "nome": "Mão de Obra Direta", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": True},
    {"codigo": "4.1.10", "nome": "Gastos Gerais de Fabricação", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.11", "nome": "IPI sobre Vendas", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.12", "nome": "ICMS sobre Vendas Industriais", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
]

_CONTAS_AGRICULTURA = [
    {"codigo": "1.1.08", "nome": "Estoques de Insumos Agrícolas", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.09", "nome": "Produção em Andamento (Safra)", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.1.10", "nome": "Produtos Agrícolas em Estoque", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.1", "is_required": True},
    {"codigo": "1.2.04", "nome": "Terras e Benfeitorias", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.2", "is_required": True},
    {"codigo": "1.2.05", "nome": "Máquinas e Implementos Agrícolas", "tipo": TipoConta.ATIVO, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "1.2", "is_required": False},
    {"codigo": "2.1.05", "nome": "Crédito Rural a Pagar (CP)", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.1", "is_required": True},
    {"codigo": "2.2.02", "nome": "Crédito Rural a Pagar (LP)", "tipo": TipoConta.PASSIVO, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "2.2", "is_required": True},
    {"codigo": "5.1", "nome": "RECEITAS RURAIS", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": False, "parent": "5", "is_required": True},
    {"codigo": "5.1.01", "nome": "Receitas de Venda de Produção Rural", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.1", "is_required": True},
    {"codigo": "5.1.02", "nome": "Receitas de Arrendamento Rural", "tipo": TipoConta.RECEITA, "natureza": NaturezaConta.CREDORA, "is_analitica": True, "parent": "5.1", "is_required": False},
    {"codigo": "4.1.07", "nome": "Custo da Produção Rural", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": True},
    {"codigo": "4.1.08", "nome": "Insumos Agrícolas", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.09", "nome": "Mão de Obra Rural / Diaristas", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.10", "nome": "ITR — Imposto Territorial Rural", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
    {"codigo": "4.1.11", "nome": "Funrural", "tipo": TipoConta.DESPESA, "natureza": NaturezaConta.DEVEDORA, "is_analitica": True, "parent": "4.1", "is_required": False},
]

# Mapeamento atividade → listas de contas
_TEMPLATES_DATA = {
    AtividadeEconomica.SERVICOS: {
        "codigo": "SERVICOS_v1",
        "nome": "Plano Padrão — Prestação de Serviços",
        "descricao": "Template baseado na NBC TG para empresas prestadoras de serviços (ISS, folha, contratos).",
        "contas": _CONTAS_COMUNS + _CONTAS_SERVICOS,
    },
    AtividadeEconomica.COMERCIO: {
        "codigo": "COMERCIO_v1",
        "nome": "Plano Padrão — Comércio",
        "descricao": "Template para empresas comerciais com controle de estoque, CMV e ICMS.",
        "contas": _CONTAS_COMUNS + _CONTAS_COMERCIO,
    },
    AtividadeEconomica.INDUSTRIA: {
        "codigo": "INDUSTRIA_v1",
        "nome": "Plano Padrão — Indústria",
        "descricao": "Template para indústrias com custo de produção, matéria-prima e CIAP.",
        "contas": _CONTAS_COMUNS + _CONTAS_INDUSTRIA,
    },
    AtividadeEconomica.AGRICULTURA: {
        "codigo": "AGRICULTURA_v1",
        "nome": "Plano Padrão — Agricultura",
        "descricao": "Template para empresas rurais com crédito fundiário, safras e ITR.",
        "contas": _CONTAS_COMUNS + _CONTAS_AGRICULTURA,
    },
}


def seed_templates(session: Session) -> None:
    """
    Popula os templates de plano de contas no banco de dados.
    Idempotente: pula templates já existentes pelo código.
    """
    now = datetime.now(timezone.utc)
    inserted = 0

    for atividade, data in _TEMPLATES_DATA.items():
        # Verificar se o template já existe
        existing = session.exec(
            select(ModeloPlanoConta).where(ModeloPlanoConta.codigo == data["codigo"])
        ).first()

        if existing:
            logger.info("[SEED] Template '%s' já existe — pulando.", data["codigo"])
            continue

        modelo = ModeloPlanoConta(
            codigo=data["codigo"],
            nome=data["nome"],
            atividade_economica=atividade,
            versao=1,
            descricao=data["descricao"],
            ativo=True,
            criado_em=now,
            atualizado_em=now,
        )
        session.add(modelo)
        session.flush()  # Obter o ID antes de criar os itens

        for conta in data["contas"]:
            item = ModeloPlanoContaItem(
                modelo_id=modelo.id,
                codigo_estruturado=conta["codigo"],
                nome=conta["nome"],
                tipo=conta["tipo"],
                natureza=conta["natureza"],
                is_analitica=conta.get("is_analitica", True),
                parent_codigo=conta.get("parent"),
                is_required=conta.get("is_required", False),
                criado_em=now,
                atualizado_em=now,
            )
            session.add(item)

        inserted += 1
        logger.info("[SEED] Template '%s' inserido com %d contas.", data["codigo"], len(data["contas"]))

    session.commit()
    logger.info("[SEED] Templates de Plano de Contas: %d template(s) inserido(s).", inserted)


if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    from app.models.database import engine, Session
    logging.basicConfig(level=logging.INFO)
    with Session(engine) as session:
        seed_templates(session)
