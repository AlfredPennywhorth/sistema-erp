"""modulo_aplicacoes_financeiras

Revision ID: d9e4b2a1c3f7
Revises: 21d3115ea191
Create Date: 2026-04-15 20:30:00.000000

Cria as tabelas:
  - aplicacoes_financeiras
  - rendimentos_aplicacao
  - resgates_aplicacao

Regra: as aplicações NÃO compartilham saldo com ContaBancaria.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d9e4b2a1c3f7"
down_revision: Union[str, Sequence[str], None] = "21d3115ea191"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- aplicacoes_financeiras ---
    op.create_table(
        "aplicacoes_financeiras",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("conta_bancaria_origem_id", sa.Uuid(), nullable=False),
        sa.Column("nome", sqlmodel.AutoString(length=255), nullable=False),
        sa.Column(
            "tipo",
            sa.Enum(
                "CDB", "LCI", "LCA", "POUPANCA", "TESOURO_DIRETO",
                "FUNDO_INVESTIMENTO", "DEBENTURE", "OUTROS",
                name="tipoaplicacaofinanceira",
            ),
            nullable=False,
        ),
        sa.Column("instituicao", sqlmodel.AutoString(length=255), nullable=True),
        sa.Column("numero_contrato", sqlmodel.AutoString(length=100), nullable=True),
        sa.Column("valor_aplicado", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("saldo_atual", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("rendimento_total", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("taxa_rendimento", sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column("data_aplicacao", sa.Date(), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=True),
        sa.Column("data_resgate", sa.Date(), nullable=True),
        sa.Column("conta_contabil_aplicacao_id", sa.Uuid(), nullable=False),
        sa.Column("conta_contabil_receita_id", sa.Uuid(), nullable=False),
        sa.Column("conta_contabil_despesa_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "ATIVA", "RESGATADA", "VENCIDA", "CANCELADA",
                name="statusaplicacaofinanceira",
            ),
            nullable=False,
            server_default="ATIVA",
        ),
        sa.Column("observacoes", sqlmodel.AutoString(), nullable=True),
        sa.Column("usuario_criacao_id", sa.Uuid(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"]),
        sa.ForeignKeyConstraint(["conta_bancaria_origem_id"], ["contas_bancarias.id"]),
        sa.ForeignKeyConstraint(["conta_contabil_aplicacao_id"], ["plano_contas.id"]),
        sa.ForeignKeyConstraint(["conta_contabil_receita_id"], ["plano_contas.id"]),
        sa.ForeignKeyConstraint(["conta_contabil_despesa_id"], ["plano_contas.id"]),
        sa.ForeignKeyConstraint(["usuario_criacao_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_aplicacoes_empresa_id", "aplicacoes_financeiras", ["empresa_id"])
    op.create_index("ix_aplicacoes_status", "aplicacoes_financeiras", ["status"])
    op.create_index("ix_aplicacoes_data_aplicacao", "aplicacoes_financeiras", ["data_aplicacao"])
    op.create_index("ix_aplicacoes_data_vencimento", "aplicacoes_financeiras", ["data_vencimento"])

    # --- rendimentos_aplicacao ---
    op.create_table(
        "rendimentos_aplicacao",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("aplicacao_id", sa.Uuid(), nullable=False),
        sa.Column("data_rendimento", sa.Date(), nullable=False),
        sa.Column("valor_rendimento", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("saldo_antes", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("saldo_depois", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("observacoes", sqlmodel.AutoString(), nullable=True),
        sa.Column("usuario_id", sa.Uuid(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"]),
        sa.ForeignKeyConstraint(["aplicacao_id"], ["aplicacoes_financeiras.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rendimentos_aplicacao_id", "rendimentos_aplicacao", ["aplicacao_id"])
    op.create_index("ix_rendimentos_empresa_id", "rendimentos_aplicacao", ["empresa_id"])
    op.create_index("ix_rendimentos_data", "rendimentos_aplicacao", ["data_rendimento"])

    # --- resgates_aplicacao ---
    op.create_table(
        "resgates_aplicacao",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("aplicacao_id", sa.Uuid(), nullable=False),
        sa.Column(
            "tipo",
            sa.Enum("PARCIAL", "TOTAL", name="tiporesgate"),
            nullable=False,
            server_default="TOTAL",
        ),
        sa.Column("data_resgate", sa.Date(), nullable=False),
        sa.Column("valor_bruto", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("ir_retido", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("iof_retido", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("valor_liquido", sa.Numeric(precision=18, scale=2), nullable=False, server_default="0"),
        sa.Column("conta_bancaria_destino_id", sa.Uuid(), nullable=False),
        sa.Column("observacoes", sqlmodel.AutoString(), nullable=True),
        sa.Column("usuario_id", sa.Uuid(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"]),
        sa.ForeignKeyConstraint(["aplicacao_id"], ["aplicacoes_financeiras.id"]),
        sa.ForeignKeyConstraint(["conta_bancaria_destino_id"], ["contas_bancarias.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resgates_aplicacao_id", "resgates_aplicacao", ["aplicacao_id"])
    op.create_index("ix_resgates_empresa_id", "resgates_aplicacao", ["empresa_id"])
    op.create_index("ix_resgates_data", "resgates_aplicacao", ["data_resgate"])


def downgrade() -> None:
    op.drop_table("resgates_aplicacao")
    op.drop_table("rendimentos_aplicacao")
    op.drop_table("aplicacoes_financeiras")

    # Drop enums (PostgreSQL only)
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="tiporesgate").drop(bind, checkfirst=True)
        sa.Enum(name="statusaplicacaofinanceira").drop(bind, checkfirst=True)
        sa.Enum(name="tipoaplicacaofinanceira").drop(bind, checkfirst=True)
