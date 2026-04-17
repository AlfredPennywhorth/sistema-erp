# from __future__ import annotations
import logging
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship, Column, JSON, create_engine, Session, select
from sqlalchemy import Numeric, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.pool import NullPool
from uuid import UUID, uuid4
from datetime import datetime, date, timezone
from enum import Enum
from app.core.config import settings
from decimal import Decimal as PyDecimal

logger = logging.getLogger(__name__)

# Configurações de engine dinâmicas baseadas no settings.DATABASE_URL construction
_db_url = settings.DATABASE_URL

engine_kwargs = {
    "connect_args": {"check_same_thread": False} if "sqlite" in _db_url else {}
}

# Pooling vs NullPool (Detectando Pooler do Supabase)
if "sqlite" not in _db_url:
    # Forçamos NullPool para qualquer conexão Supabase ou porta de pooling (6543)
    if any(x in _db_url for x in ["supabase.co", "pooler.supabase.com", ":6543"]):
        logger.info("[DATABASE] Usando NullPool para Supabase")
        engine_kwargs.update({
            "poolclass": NullPool
        })
    else:
        engine_kwargs.update({
            "pool_size": 5,
            "max_overflow": 10,
            "pool_pre_ping": True
        })

engine = create_engine(_db_url, **engine_kwargs)
DATABASE_URL = _db_url

# --- MIXINS ---

class TenantMixin(SQLModel):
    """Garante que toda tabela vinculada a uma empresa tenha o ID e index"""
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)

class AuditMixin(SQLModel):
    """Campos de auditoria padrão"""
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)}
    )

class FullAuditMixin(TenantMixin, AuditMixin):
    """Combinação de Tenant e Auditoria"""
    pass

# --- ENUMS ---

class RegimeTributario(str, Enum):
    SIMPLES_NACIONAL = "SIMPLES_NACIONAL"
    LUCRO_PRESUMIDO = "LUCRO_PRESUMIDO"
    LUCRO_REAL = "LUCRO_REAL"
    MEI = "MEI"

class TipoPessoa(str, Enum):
    PF = "PF"
    PJ = "PJ"

class NaturezaConta(str, Enum):
    DEVEDORA = "DEVEDORA"
    CREDORA = "CREDORA"

class TipoConta(str, Enum):
    ATIVO = "ATIVO"
    PASSIVO = "PASSIVO"
    RECEITA = "RECEITA"
    DESPESA = "DESPESA"
    PATRIMONIO = "PATRIMONIO"

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    CONTADOR = "CONTADOR"
    OPERADOR = "OPERADOR"
    # Mantendo compatibilidade com perfis estendidos se necessário
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    VIEWER = "VIEWER"

class InviteStatus(str, Enum):
    PENDING = "PENDENTE"
    ACCEPTED = "ACEITO"
    EXPIRED = "EXPIRADO"

class StatusPagamento(str, Enum):
    PENDENTE = "PENDENTE"
    PAGO = "PAGO"
    ATRASADO = "ATRASADO"
    CANCELADO = "CANCELADO"

class TipoCentroCusto(str, Enum):
    SINTETICO = "SINTETICO"
    ANALITICO = "ANALITICO"

class TipoLancamento(str, Enum):
    PROVISAO = "PROVISAO"   # Regime de Competência (Título)
    CAIXA = "CAIXA"         # Regime de Caixa (Entrada/Saída Direta)
    TRANSFERENCIA = "TRANSFERENCIA"

class NaturezaFinanceira(str, Enum):
    PAGAR = "PAGAR"
    RECEBER = "RECEBER"

class TipoContaBancaria(str, Enum):
    CORRENTE = "CORRENTE"
    POUPANCA = "POUPANCA"
    INVESTIMENTO = "INVESTIMENTO"
    CREDITO = "CREDITO"
    CAIXA_FISICO = "CAIXA_FISICO"

class TipoEventoContabil(str, Enum):
    COMPRA_PRAZO = "COMPRA_PRAZO"
    COMPRA_AVISTA = "COMPRA_AVISTA"
    VENDA_PRAZO = "VENDA_PRAZO"
    VENDA_AVISTA = "VENDA_AVISTA"
    SERVICO_PRESTADO_PRAZO = "SERVICO_PRESTADO_PRAZO"
    SERVICO_PRESTADO_AVISTA = "SERVICO_PRESTADO_AVISTA"
    DESPESA_CONSUMO = "DESPESA_CONSUMO"
    ADIANTAMENTO_CLIENTE = "ADIANTAMENTO_CLIENTE"
    ADIANTAMENTO_FORNECEDOR = "ADIANTAMENTO_FORNECEDOR"
    TRANSFERENCIA_INTERNA = "TRANSFERENCIA_INTERNA"
    CONTRATACAO_EMPRESTIMO = "CONTRATACAO_EMPRESTIMO"
    PAGAMENTO_PARCELA_EMPRESTIMO = "PAGAMENTO_PARCELA_EMPRESTIMO"

class StatusLancamento(str, Enum):
    ABERTO = "ABERTO"
    PAGO = "PAGO"
    PARCIAL = "PARCIAL"
    CANCELADO = "CANCELADO"
    CONCILIADO = "CONCILIADO"

class TipoFormaPagamento(str, Enum):
    PIX = "PIX"
    TRANSFERENCIA = "TRANSFERENCIA"
    BOLETO = "BOLETO"
    CARTAO_DEBITO = "CARTAO_DEBITO"
    CARTAO_CREDITO = "CARTAO_CREDITO"
    DINHEIRO = "DINHEIRO"
    CHEQUE = "CHEQUE"

class TipoOperacaoPagamento(str, Enum):
    LIQUIDACAO_DIRETA = "LIQUIDACAO_DIRETA"
    GERACAO_FATURA = "GERACAO_FATURA"
    COMPENSACAO_BOLETO = "COMPENSACAO_BOLETO"
    LIQUIDACAO_DIFERIDA = "LIQUIDACAO_DIFERIDA"
    RECEBIMENTO_CARTAO = "RECEBIMENTO_CARTAO"

class StatusFatura(str, Enum):
    ABERTA = "ABERTA"
    FECHADA = "FECHADA"
    PAGA = "PAGA"
    CANCELADA = "CANCELADA"

class StatusEmprestimo(str, Enum):
    ATIVO = "ATIVO"
    QUITADO = "QUITADO"
    INADIMPLENTE = "INADIMPLENTE"
    CANCELADO = "CANCELADO"

class TipoAmortizacao(str, Enum):
    PRICE = "PRICE"   # parcelas fixas (tabela Price)
    SAC = "SAC"       # amortizações constantes
    LIVRE = "LIVRE"   # fluxo livre / bullet

class TipoJuros(str, Enum):
    SIMPLES = "SIMPLES"
    COMPOSTO = "COMPOSTO"

class StatusParcela(str, Enum):
    PENDENTE = "PENDENTE"
    PAGA = "PAGA"
    ATRASADA = "ATRASADA"
    CANCELADA = "CANCELADA"

class TipoAplicacaoFinanceira(str, Enum):
    CDB = "CDB"
    LCI = "LCI"
    LCA = "LCA"
    POUPANCA = "POUPANCA"
    TESOURO_DIRETO = "TESOURO_DIRETO"
    FUNDO_INVESTIMENTO = "FUNDO_INVESTIMENTO"
    DEBENTURE = "DEBENTURE"
    OUTROS = "OUTROS"

class StatusAplicacaoFinanceira(str, Enum):
    ATIVA = "ATIVA"
    RESGATADA = "RESGATADA"
    VENCIDA = "VENCIDA"
    CANCELADA = "CANCELADA"

class TipoResgate(str, Enum):
    PARCIAL = "PARCIAL"
    TOTAL = "TOTAL"

class AtividadeEconomica(str, Enum):
    SERVICOS = "SERVICOS"
    COMERCIO = "COMERCIO"
    INDUSTRIA = "INDUSTRIA"
    AGRICULTURA = "AGRICULTURA"

class StatusLoteContabil(str, Enum):
    ABERTO = "ABERTO"
    CONCILIADO = "CONCILIADO"
    CANCELADO = "CANCELADO"

# --- MODELS ---

class User(SQLModel, table=True):
    __tablename__ = "usuarios"
    id: UUID = Field(primary_key=True) # UUID do Supabase
    email: str = Field(unique=True, index=True)
    nome: Optional[str] = Field(default=None)
    avatar_url: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SegmentoMercado(SQLModel, table=True):
    __tablename__ = "segmentos_mercado"
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(max_length=100)
    descricao: Optional[str] = Field(default=None)

class Empresa(SQLModel, table=True):
    __tablename__ = "empresas"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    razao_social: str = Field(max_length=255)
    nome_fantasia: Optional[str] = Field(default=None, max_length=255)
    cnpj: str = Field(unique=True, index=True, min_length=14, max_length=14)
    inscricao_estadual: Optional[str] = Field(default=None, max_length=20)
    inscricao_municipal: Optional[str] = Field(default=None, max_length=20)
    cnae_principal: str = Field(max_length=7, default="0000000")
    regime_tributario: RegimeTributario
    faturamento_anual: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    segmento_mercado_id: Optional[int] = Field(default=None)
    classificacao_fiscal: Optional[RegimeTributario] = Field(default=None)
    cep: str = Field(max_length=8)
    logradouro: str = Field(max_length=255)
    numero: str = Field(max_length=20)
    complemento: Optional[str] = Field(default=None, max_length=100)
    bairro: str = Field(max_length=100)
    cidade: str = Field(max_length=100)
    uf: str = Field(max_length=2)
    codigo_municipio_ibge: str = Field(min_length=7, max_length=7)
    configuracoes: dict = Field(default_factory=dict, sa_column=Column(JSON))
    strict_compliance_sod: bool = Field(default=True) # Trava de Segregação de Funções
    excluido_em: Optional[datetime] = Field(default=None)
    # Módulo Contábil
    atividade_economica: Optional[AtividadeEconomica] = Field(default=None, nullable=True)
    modulo_contabil_ativo: bool = Field(default=False)
    plano_contas_template_id: Optional[UUID] = Field(default=None, nullable=True)
    plano_contas_template_versao: Optional[int] = Field(default=None, nullable=True)

class UsuarioEmpresa(SQLModel, table=True):
    __tablename__ = "usuario_empresas"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    usuario_id: UUID = Field(foreign_key="usuarios.id", index=True) 
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True) 
    role: UserRole = Field(default=UserRole.OPERADOR)
    ativo: bool = Field(default=True)

class ModeloPlanoConta(AuditMixin, table=True):
    """
    Template de Plano de Contas global (sem empresa_id).
    Imutável após publicação. Versionado por (codigo, versao).
    """
    __tablename__ = "modelos_plano_contas"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    codigo: str = Field(max_length=50, index=True)
    nome: str = Field(max_length=255)
    atividade_economica: AtividadeEconomica = Field(index=True)
    versao: int = Field(default=1)
    descricao: Optional[str] = Field(default=None)
    ativo: bool = Field(default=True)

class ModeloPlanoContaItem(AuditMixin, table=True):
    """
    Conta individual dentro de um template. Imutável após publicação.
    Usa parent_codigo (string) para hierarquia, resolvida na clonagem.
    """
    __tablename__ = "modelos_plano_contas_itens"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    modelo_id: UUID = Field(foreign_key="modelos_plano_contas.id", index=True)
    codigo_estruturado: str = Field(max_length=50)
    nome: str = Field(max_length=100)
    tipo: TipoConta
    natureza: NaturezaConta
    is_analitica: bool = Field(default=True)
    parent_codigo: Optional[str] = Field(default=None, max_length=50)
    is_required: bool = Field(default=False)  # Contas críticas do template

class PlanoConta(FullAuditMixin, table=True):
    __tablename__ = "plano_contas"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    codigo_estruturado: str = Field(max_length=50) # Ex: 1.1.01
    nome: str = Field(max_length=100)
    tipo: TipoConta 
    natureza: NaturezaConta
    is_analitica: bool = Field(default=True)
    ativo: bool = Field(default=True) # Nova diretriz de negócio
    parent_id: Optional[UUID] = Field(default=None, foreign_key="plano_contas.id")
    # Rastreabilidade de template
    template_conta_origem_id: Optional[UUID] = Field(default=None, foreign_key="modelos_plano_contas_itens.id", nullable=True)
    origem: str = Field(default="MANUAL", max_length=20)  # TEMPLATE ou MANUAL
    is_required: bool = Field(default=False)  # Contas obrigatórias não podem ser deletadas

class Banco(AuditMixin, table=True):
    __tablename__ = "bancos"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    codigo_bacen: str = Field(max_length=10, unique=True, index=True)
    nome: str = Field(max_length=255)
    
class ContaBancaria(FullAuditMixin, table=True):
    __tablename__ = "contas_bancarias"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    banco_id: UUID = Field(foreign_key="bancos.id")
    nome: str = Field(max_length=100) # Ex: Bradesco PJ
    agencia: str = Field(max_length=20)
    conta: str = Field(max_length=20)
    tipo_conta: TipoContaBancaria = Field(default=TipoContaBancaria.CORRENTE)
    saldo_inicial: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    saldo_atual: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    limite_credito: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    conta_contabil_id: Optional[UUID] = Field(default=None, foreign_key="plano_contas.id")
    ativo: bool = Field(default=True)
    
class CentroCusto(FullAuditMixin, table=True):
    __tablename__ = "centros_custo"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    codigo: str = Field(max_length=50) # Ex: CC-001
    nome: str = Field(max_length=100) # Ex: Marketing
    tipo: TipoCentroCusto = Field(default=TipoCentroCusto.ANALITICO)
    is_active: bool = Field(default=True)
    parent_id: Optional[UUID] = Field(default=None, foreign_key="centros_custo.id")
    
class FormaPagamento(FullAuditMixin, table=True):
    __tablename__ = "formas_pagamento"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    nome: str = Field(max_length=100)
    taxa_padrao: PyDecimal = Field(default=0, sa_type=Numeric(precision=5, scale=2))
    is_active: bool = Field(default=True)
    # Campos operacionais
    tipo: Optional[TipoFormaPagamento] = Field(default=None, nullable=True)
    tipo_operacao: TipoOperacaoPagamento = Field(default=TipoOperacaoPagamento.LIQUIDACAO_DIRETA)
    baixa_imediata: bool = Field(default=True)
    gera_obrigacao_futura: bool = Field(default=False)
    prazo_liquidacao_dias: int = Field(default=0)
    permite_parcelamento: bool = Field(default=False)
    max_parcelas: int = Field(default=1)
    conta_transitoria_id: Optional[UUID] = Field(default=None, foreign_key="plano_contas.id", nullable=True)
    # Calendário de cartão
    dia_fechamento: Optional[int] = Field(default=None, nullable=True)   # Dia do mês em que a fatura fecha
    dia_vencimento: Optional[int] = Field(default=None, nullable=True)   # Dia do mês em que a fatura vence


class BandeiraCartao(FullAuditMixin, table=True):
    """Taxas de administração por bandeira de cartão, por empresa."""
    __tablename__ = "bandeiras_cartao"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    forma_pagamento_id: UUID = Field(foreign_key="formas_pagamento.id", index=True)
    nome: str = Field(max_length=50)  # Visa, Mastercard, Elo, Amex, Hipercard
    taxa_debito: PyDecimal = Field(default=0, sa_type=Numeric(precision=6, scale=4))        # Ex: 1.20% → 1.2000
    taxa_credito_1x: PyDecimal = Field(default=0, sa_type=Numeric(precision=6, scale=4))
    taxa_credito_2_6x: PyDecimal = Field(default=0, sa_type=Numeric(precision=6, scale=4))
    taxa_credito_7_12x: PyDecimal = Field(default=0, sa_type=Numeric(precision=6, scale=4))
    prazo_repasse_dias: int = Field(default=30)  # Dias para crédito na conta bancária
    is_active: bool = Field(default=True)

class LoteContabil(AuditMixin, table=True):
    """
    Agrupador de partidas contábeis (lançamento balanceado).
    Garante que soma_debitos == soma_creditos por lote.
    """
    __tablename__ = "lotes_contabeis"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    data_lancamento: date = Field(index=True)
    historico: str = Field(max_length=500)
    documento_referencia: Optional[str] = Field(default=None, max_length=100)
    modulo_origem: str = Field(default="MANUAL", max_length=50)
    lancamento_financeiro_id: Optional[UUID] = Field(default=None, foreign_key="lancamentos_financeiros.id", nullable=True, index=True)
    usuario_id: Optional[UUID] = Field(default=None)
    status: StatusLoteContabil = Field(default=StatusLoteContabil.ABERTO, index=True)

class JournalEntry(AuditMixin, table=True):
    __tablename__ = "journal_entries"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    conta_id: UUID = Field(foreign_key="plano_contas.id", index=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    data_lancamento: date = Field(index=True)
    valor: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    debito_credito: str = Field(max_length=1)
    historico: Optional[str] = Field(default=None)
    documento_referencia: Optional[str] = Field(default=None, max_length=100)
    modulo_origem: str = Field(default="FINANCEIRO", max_length=50)
    usuario_id: Optional[UUID] = Field(default=None)
    lote_id: Optional[UUID] = Field(default=None, foreign_key="lotes_contabeis.id", nullable=True, index=True)

class RegraContabil(FullAuditMixin, table=True):
    __tablename__ = "regras_contabeis"
    __table_args__ = (
        UniqueConstraint("empresa_id", "tipo_evento", "natureza", name="uq_regra_evento_natureza"),
    )

    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    tipo_evento: TipoEventoContabil = Field(nullable=False)
    natureza: NaturezaFinanceira = Field(nullable=False)
    conta_debito_id: UUID = Field(foreign_key="plano_contas.id", nullable=False)
    conta_credito_id: UUID = Field(foreign_key="plano_contas.id", nullable=False)
    historico_padrao: Optional[str] = Field(default=None)
    ativo: bool = Field(default=True)

class LogAuditoria(AuditMixin, table=True):
    __tablename__ = "logs_auditoria"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    usuario_id: Optional[UUID] = Field(default=None)
    acao: str = Field(max_length=50)
    tabela_afetada: str = Field(max_length=50)
    registro_id: UUID
    dados_anteriores: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    dados_novos: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    ip_origem: Optional[str] = Field(default=None, max_length=45)

class Invite(AuditMixin, table=True):
    __tablename__ = "convites"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    email: str = Field(index=True)
    role: UserRole
    token: str = Field(unique=True, index=True)
    status: InviteStatus = Field(default=InviteStatus.PENDING)
    expira_em: datetime
    aceito_em: Optional[datetime] = Field(default=None)

class HonorariosContador(AuditMixin, table=True):
    __tablename__ = "honorarios_contador"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    usuario_id: UUID = Field(foreign_key="usuarios.id", index=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    valor: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    data_vencimento: date
    status_pagamento: StatusPagamento = Field(default=StatusPagamento.PENDENTE)
    observacoes: Optional[str] = Field(default=None)

class TrilhaAuditoriaContador(SQLModel, table=True):
    __tablename__ = "trilha_auditoria_contador"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    usuario_id: UUID = Field(foreign_key="usuarios.id", index=True)
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True)
    acao: str = Field(max_length=100)
    detalhes: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Representante(FullAuditMixin, table=True):
    __tablename__ = "representantes"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    nome: str = Field(max_length=100)
    cpf: str = Field(unique=True, index=True, max_length=11)
    email: str = Field(index=True)
    telefone: Optional[str] = Field(default=None, max_length=20)
    cargo: str = Field(default="Socio-Administrador")
    is_active: bool = Field(default=True)

class Documento(FullAuditMixin, table=True):
    __tablename__ = "documentos"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tipo: str = Field(max_length=50) # Ex: RG, CPF, Contrato Social
    numero: str = Field(max_length=100)
    url_storage: str = Field(max_length=500)
    validade: Optional[date] = Field(default=None)
    referencia_modulo: Optional[str] = Field(default=None, max_length=50)

class Parceiro(FullAuditMixin, table=True):
    __tablename__ = "parceiros"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tipo_pessoa: TipoPessoa = Field(default=TipoPessoa.PJ)
    nome_razao: str = Field(max_length=255)
    nome_fantasia: Optional[str] = Field(default=None, max_length=255)
    cpf_cnpj: str = Field(index=True, max_length=18)
    is_cliente: bool = Field(default=True)
    is_fornecedor: bool = Field(default=False)
    inscricao_estadual: Optional[str] = Field(default=None, max_length=20)
    inscricao_municipal: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=255)
    telefone: Optional[str] = Field(default=None, max_length=20)
    
    # Endereço
    cep: Optional[str] = Field(default=None, max_length=8)
    logradouro: Optional[str] = Field(default=None, max_length=255)
    numero: Optional[str] = Field(default=None, max_length=20)
    complemento: Optional[str] = Field(default=None, max_length=100)
    bairro: Optional[str] = Field(default=None, max_length=100)
    cidade: Optional[str] = Field(default=None, max_length=100)
    uf: Optional[str] = Field(default=None, max_length=2)
    
    # Integração Financeira
    conta_padrao_id: Optional[UUID] = Field(default_factory=None, foreign_key="plano_contas.id")
    observacoes: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)
    
    # Relacionamentos
    contatos: List["ParceiroContato"] = Relationship(back_populates="parceiro", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class ParceiroContato(FullAuditMixin, table=True):
    __tablename__ = "parceiro_contatos"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    parceiro_id: UUID = Field(foreign_key="parceiros.id", index=True)
    nome: str = Field(max_length=255)
    email: Optional[str] = Field(default=None, max_length=255)
    telefone: Optional[str] = Field(default=None, max_length=20)
    cargo: Optional[str] = Field(default=None, max_length=100)
    is_principal: bool = Field(default=False)

    parceiro: "Parceiro" = Relationship(back_populates="contatos")

class FaturaCartao(FullAuditMixin, table=True):
    __tablename__ = "faturas_cartao"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    forma_pagamento_id: UUID = Field(foreign_key="formas_pagamento.id", index=True)
    mes_referencia: date = Field(index=True)  # Sempre YYYY-MM-01
    data_vencimento: date
    data_fechamento: date
    valor_total: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    status: StatusFatura = Field(default=StatusFatura.ABERTA, index=True)
    # FK circular resolvida via use_alter na migração; sem restrição FK no model
    lancamento_pagamento_id: Optional[UUID] = Field(default=None, nullable=True)

class LancamentoFinanceiro(FullAuditMixin, table=True):
    __tablename__ = "lancamentos_financeiros"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)

    parceiro: Optional["Parceiro"] = Relationship()
    
    # Classificação
    tipo: TipoLancamento = Field(default=TipoLancamento.PROVISAO)
    natureza: NaturezaFinanceira = Field(index=True)
    status: StatusLancamento = Field(default=StatusLancamento.ABERTO, index=True)
    
    __table_args__ = (
        Index("ix_lancamento_performance", "empresa_id", "status", "natureza"),
    )
    
    # Vínculos
    parceiro_id: Optional[UUID] = Field(default=None, foreign_key="parceiros.id", index=True)
    plano_contas_id: UUID = Field(foreign_key="plano_contas.id", index=True)
    centro_custo_id: Optional[UUID] = Field(default=None, foreign_key="centros_custo.id", index=True)
    conta_bancaria_id: Optional[UUID] = Field(default=None, foreign_key="contas_bancarias.id", index=True)
    forma_pagamento_id: Optional[UUID] = Field(default=None, foreign_key="formas_pagamento.id", index=True)
    fatura_cartao_id: Optional[UUID] = Field(default=None, foreign_key="faturas_cartao.id", nullable=True, index=True)
    
    # Valores
    valor_previsto: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    valor_pago: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    juros_multa: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    desconto: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    
    # Datas
    data_vencimento: date = Field(index=True)
    data_competencia: date = Field(default_factory=lambda: date.today())
    data_pagamento: Optional[date] = Field(default=None, index=True)
    
    # Descritivo
    descricao: str = Field(max_length=255)
    documento: Optional[str] = Field(default=None, max_length=100)
    observacoes: Optional[str] = Field(default=None)
    
    # Governança (SoD)
    usuario_criacao_id: UUID = Field(foreign_key="usuarios.id")
    usuario_liquidacao_id: Optional[UUID] = Field(default=None, foreign_key="usuarios.id")

class Emprestimo(FullAuditMixin, table=True):
    __tablename__ = "emprestimos"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)

    # Credor / Instituição Financeira
    parceiro_id: Optional[UUID] = Field(default=None, foreign_key="parceiros.id", index=True)

    # Conta bancária receptora do valor
    conta_bancaria_id: UUID = Field(foreign_key="contas_bancarias.id", index=True)

    # Vínculos Contábeis OBRIGATÓRIOS
    # Conta de Passivo: ex. "2.1.01 - Empréstimos e Financiamentos a Pagar"
    conta_contabil_passivo_id: UUID = Field(foreign_key="plano_contas.id")
    # Conta de Despesa: ex. "4.1.03 - Juros Passivos sobre Empréstimos"
    conta_contabil_juros_id: UUID = Field(foreign_key="plano_contas.id")

    # Valores
    valor_contratado: PyDecimal = Field(sa_type=Numeric(precision=18, scale=2))
    saldo_devedor: PyDecimal = Field(sa_type=Numeric(precision=18, scale=2))

    # Taxa e Condições
    taxa_juros: PyDecimal = Field(sa_type=Numeric(precision=10, scale=6))  # ex: 0.012000 = 1.2% a.m.
    tipo_juros: TipoJuros = Field(default=TipoJuros.COMPOSTO)
    tipo_amortizacao: TipoAmortizacao = Field(default=TipoAmortizacao.PRICE)

    # Datas
    data_contratacao: date
    data_primeira_parcela: date
    data_vencimento_final: date

    # Parcelas
    numero_parcelas: int = Field(default=1)
    periodicidade_dias: int = Field(default=30)  # 30=mensal, 90=trimestral, etc.
    carencia_dias: int = Field(default=0)

    # Status
    status: StatusEmprestimo = Field(default=StatusEmprestimo.ATIVO, index=True)

    # Descritivo
    descricao: Optional[str] = Field(default=None, max_length=255)
    numero_contrato: Optional[str] = Field(default=None, max_length=100)
    observacoes: Optional[str] = Field(default=None)

    # Governança
    usuario_criacao_id: UUID = Field(foreign_key="usuarios.id")

    # Relacionamento
    parcelas: List["ParcelaEmprestimo"] = Relationship(back_populates="emprestimo")


class ParcelaEmprestimo(FullAuditMixin, table=True):
    __tablename__ = "parcelas_emprestimo"
    __table_args__ = (
        Index("ix_parcela_emprestimo_vencimento", "empresa_id", "status", "data_vencimento"),
    )
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)

    emprestimo_id: UUID = Field(foreign_key="emprestimos.id", index=True)
    numero_parcela: int

    # Valores decompostos (principal + juros separados — regra fundamental)
    valor_principal: PyDecimal = Field(sa_type=Numeric(precision=18, scale=2))
    valor_juros: PyDecimal = Field(sa_type=Numeric(precision=18, scale=2))
    valor_total: PyDecimal = Field(sa_type=Numeric(precision=18, scale=2))
    valor_pago: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))

    # Datas
    data_vencimento: date = Field(index=True)
    data_pagamento: Optional[date] = Field(default=None)

    # Status
    status: StatusParcela = Field(default=StatusParcela.PENDENTE, index=True)

    # Vínculo com lançamento financeiro gerado no pagamento
    lancamento_id: Optional[UUID] = Field(default=None, foreign_key="lancamentos_financeiros.id")

    # Governança SoD
    usuario_liquidacao_id: Optional[UUID] = Field(default=None, foreign_key="usuarios.id")

    emprestimo: "Emprestimo" = Relationship(back_populates="parcelas")

class AplicacaoFinanceira(FullAuditMixin, table=True):
    """
    Entidade de aplicação financeira — completamente separada do caixa operacional.
    O saldo_atual aqui representa o valor corrente da aplicação, NÃO o saldo bancário.
    """
    __tablename__ = "aplicacoes_financeiras"

    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)

    # Vínculos operacionais
    conta_bancaria_origem_id: UUID = Field(foreign_key="contas_bancarias.id", index=True)

    # Descrição
    nome: str = Field(max_length=255)
    tipo: TipoAplicacaoFinanceira = Field(default=TipoAplicacaoFinanceira.CDB)
    instituicao: Optional[str] = Field(default=None, max_length=255)
    numero_contrato: Optional[str] = Field(default=None, max_length=100)

    # Valores (ISOLADOS do saldo bancário)
    valor_aplicado: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    saldo_atual: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    rendimento_total: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    taxa_rendimento: Optional[PyDecimal] = Field(default=None, sa_type=Numeric(precision=10, scale=6))

    # Datas
    data_aplicacao: date = Field(index=True)
    data_vencimento: Optional[date] = Field(default=None, index=True)
    data_resgate: Optional[date] = Field(default=None)

    # Vínculo contábil obrigatório (segregação de contas)
    conta_contabil_aplicacao_id: UUID = Field(foreign_key="plano_contas.id")   # ATIVO
    conta_contabil_receita_id: UUID = Field(foreign_key="plano_contas.id")     # RECEITA de rendimentos
    conta_contabil_despesa_id: UUID = Field(foreign_key="plano_contas.id")     # DESPESA de IR/IOF

    # Governança
    status: StatusAplicacaoFinanceira = Field(default=StatusAplicacaoFinanceira.ATIVA, index=True)
    observacoes: Optional[str] = Field(default=None)
    usuario_criacao_id: UUID = Field(foreign_key="usuarios.id")

    # Relacionamentos
    rendimentos: List["RendimentoAplicacao"] = Relationship(back_populates="aplicacao", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    resgates: List["ResgateAplicacao"] = Relationship(back_populates="aplicacao", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class RendimentoAplicacao(FullAuditMixin, table=True):
    """Registro de cada evento de rendimento/atualização de saldo da aplicação."""
    __tablename__ = "rendimentos_aplicacao"

    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    aplicacao_id: UUID = Field(foreign_key="aplicacoes_financeiras.id", index=True)

    data_rendimento: date = Field(index=True)
    valor_rendimento: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    saldo_antes: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    saldo_depois: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    observacoes: Optional[str] = Field(default=None)
    usuario_id: UUID = Field(foreign_key="usuarios.id")

    aplicacao: "AplicacaoFinanceira" = Relationship(back_populates="rendimentos")


class ResgateAplicacao(FullAuditMixin, table=True):
    """Registro de resgate (parcial ou total) de uma aplicação financeira."""
    __tablename__ = "resgates_aplicacao"

    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    aplicacao_id: UUID = Field(foreign_key="aplicacoes_financeiras.id", index=True)

    tipo: TipoResgate = Field(default=TipoResgate.TOTAL)
    data_resgate: date = Field(index=True)

    # Valores do resgate
    valor_bruto: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    ir_retido: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    iof_retido: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))
    valor_liquido: PyDecimal = Field(default=0, sa_type=Numeric(precision=18, scale=2))

    # Conta bancária que recebe o crédito do resgate
    conta_bancaria_destino_id: UUID = Field(foreign_key="contas_bancarias.id")

    observacoes: Optional[str] = Field(default=None)
    usuario_id: UUID = Field(foreign_key="usuarios.id")

    aplicacao: "AplicacaoFinanceira" = Relationship(back_populates="resgates")


# --- DATABASE SETUP ---

def create_db_and_tables():
    # Isso criará as tabelas no banco definido pela DATABASE_URL
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
