"""modulo_emprestimos

Revision ID: c4a7f1b2e3d8
Revises: 21d3115ea191
Create Date: 2026-04-15 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'c4a7f1b2e3d8'
down_revision: Union[str, Sequence[str], None] = '21d3115ea191'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create emprestimos and parcelas_emprestimo tables."""

    op.create_table(
        'emprestimos',
        sa.Column('empresa_id', sa.Uuid(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('parceiro_id', sa.Uuid(), nullable=True),
        sa.Column('conta_bancaria_id', sa.Uuid(), nullable=False),
        sa.Column('conta_contabil_passivo_id', sa.Uuid(), nullable=False),
        sa.Column('conta_contabil_juros_id', sa.Uuid(), nullable=False),
        sa.Column('valor_contratado', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('saldo_devedor', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('taxa_juros', sa.Numeric(precision=10, scale=6), nullable=False),
        sa.Column('tipo_juros', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tipo_amortizacao', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('data_contratacao', sa.Date(), nullable=False),
        sa.Column('data_primeira_parcela', sa.Date(), nullable=False),
        sa.Column('data_vencimento_final', sa.Date(), nullable=False),
        sa.Column('numero_parcelas', sa.Integer(), nullable=False),
        sa.Column('periodicidade_dias', sa.Integer(), nullable=False),
        sa.Column('carencia_dias', sa.Integer(), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('descricao', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('numero_contrato', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('observacoes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('usuario_criacao_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['conta_bancaria_id'], ['contas_bancarias.id']),
        sa.ForeignKeyConstraint(['conta_contabil_juros_id'], ['plano_contas.id']),
        sa.ForeignKeyConstraint(['conta_contabil_passivo_id'], ['plano_contas.id']),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['parceiro_id'], ['parceiros.id']),
        sa.ForeignKeyConstraint(['usuario_criacao_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_emprestimos_empresa_id', 'emprestimos', ['empresa_id'], unique=False)
    op.create_index('ix_emprestimos_parceiro_id', 'emprestimos', ['parceiro_id'], unique=False)
    op.create_index('ix_emprestimos_conta_bancaria_id', 'emprestimos', ['conta_bancaria_id'], unique=False)
    op.create_index('ix_emprestimos_status', 'emprestimos', ['status'], unique=False)

    op.create_table(
        'parcelas_emprestimo',
        sa.Column('empresa_id', sa.Uuid(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('emprestimo_id', sa.Uuid(), nullable=False),
        sa.Column('numero_parcela', sa.Integer(), nullable=False),
        sa.Column('valor_principal', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('valor_juros', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('valor_total', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('valor_pago', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('data_vencimento', sa.Date(), nullable=False),
        sa.Column('data_pagamento', sa.Date(), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('lancamento_id', sa.Uuid(), nullable=True),
        sa.Column('usuario_liquidacao_id', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['emprestimo_id'], ['emprestimos.id']),
        sa.ForeignKeyConstraint(['lancamento_id'], ['lancamentos_financeiros.id']),
        sa.ForeignKeyConstraint(['usuario_liquidacao_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_parcelas_emprestimo_emprestimo_id', 'parcelas_emprestimo', ['emprestimo_id'], unique=False)
    op.create_index('ix_parcelas_emprestimo_status', 'parcelas_emprestimo', ['status'], unique=False)
    op.create_index('ix_parcelas_emprestimo_data_vencimento', 'parcelas_emprestimo', ['data_vencimento'], unique=False)
    op.create_index(
        'ix_parcela_emprestimo_vencimento',
        'parcelas_emprestimo',
        ['empresa_id', 'status', 'data_vencimento'],
        unique=False,
    )


def downgrade() -> None:
    """Drop emprestimos and parcelas_emprestimo tables."""
    op.drop_index('ix_parcela_emprestimo_vencimento', table_name='parcelas_emprestimo')
    op.drop_index('ix_parcelas_emprestimo_data_vencimento', table_name='parcelas_emprestimo')
    op.drop_index('ix_parcelas_emprestimo_status', table_name='parcelas_emprestimo')
    op.drop_index('ix_parcelas_emprestimo_emprestimo_id', table_name='parcelas_emprestimo')
    op.drop_table('parcelas_emprestimo')

    op.drop_index('ix_emprestimos_status', table_name='emprestimos')
    op.drop_index('ix_emprestimos_conta_bancaria_id', table_name='emprestimos')
    op.drop_index('ix_emprestimos_parceiro_id', table_name='emprestimos')
    op.drop_index('ix_emprestimos_empresa_id', table_name='emprestimos')
    op.drop_table('emprestimos')
