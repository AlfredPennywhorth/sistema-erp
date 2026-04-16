# from __future__ import annotations
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship, Column, JSON, create_engine, Session, select
from sqlalchemy import Numeric, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.pool import NullPool
from uuid import UUID, uuid4
from datetime import datetime, date, timezone
from enum import Enum
import os
from dotenv import load_dotenv
from decimal import Decimal as PyDecimal

load_dotenv(override=True)

# Lê do .env ou fallback para SQLite local
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./erp.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Supabase exige sslmode=require para conexões externas
if "supabase.co" in DATABASE_URL and "sslmode=" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{separator}sslmode=require"

# Configurações de engine dinâmicas para evitar erros de tipo
engine_kwargs = {
    "connect_args": {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
}

# Pooling vs NullPool (Detectando Pooler do Supabase)
if "sqlite" not in DATABASE_URL:
    # Forçamos NullPool para qualquer conexão Supabase ou porta de pooling (6543)
    # Isso evita travamentos de conexão e melhora a resiliência em ambientes instáveis
    if any(x in DATABASE_URL for x in ["supabase.co", "pooler.supabase.com", ":6543"]):
        print("--- [DATABASE] Usando NullPool para Supabase ---")
        engine_kwargs.update({
            "poolclass": NullPool
        })
    else:
        engine_kwargs.update({
            "pool_size": 5,
            "max_overflow": 10,
            "pool_pre_ping": True
        })

engine = create_engine(DATABASE_URL, **engine_kwargs)

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

class UsuarioEmpresa(SQLModel, table=True):
    __tablename__ = "usuario_empresas"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    usuario_id: UUID = Field(foreign_key="usuarios.id", index=True) 
    empresa_id: UUID = Field(foreign_key="empresas.id", index=True) 
    role: UserRole = Field(default=UserRole.OPERADOR)
    ativo: bool = Field(default=True)

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
    nome: str = Field(max_length=100) # Ex: PIX, Boleto, Cartão de Crédito
    taxa_padrao: PyDecimal = Field(default=0, sa_type=Numeric(precision=5, scale=2))
    is_active: bool = Field(default=True)

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


# --- DATABASE SETUP ---

def create_db_and_tables():
    # Isso criará as tabelas no banco definido pela DATABASE_URL
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
