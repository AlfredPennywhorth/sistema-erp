"""bandeiras_cartao e evolucao forma pagamento

Revision ID: c6e3a1f9b2d5
Revises: b5f2a8c3d1e9
Create Date: 2026-04-15 20:23:00.000000

Adiciona dia_vencimento e dia_fechamento em formas_pagamento,
RECEBIMENTO_CARTAO ao enum tipooperacaopagamento,
e cria a tabela bandeiras_cartao.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = 'c6e3a1f9b2d5'
down_revision: Union[str, Sequence[str], None] = 'b5f2a8c3d1e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Adicionar novo valor ao enum tipooperacaopagamento ---
    # PostgreSQL: ADD VALUE é transacional-safe com IF NOT EXISTS
    op.execute(
        "ALTER TYPE tipooperacaopagamento ADD VALUE IF NOT EXISTS 'RECEBIMENTO_CARTAO'"
    )

    # --- Evoluir formas_pagamento ---
    with op.batch_alter_table('formas_pagamento', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('dia_fechamento', sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column('dia_vencimento', sa.Integer(), nullable=True)
        )

    # --- Criar tabela bandeiras_cartao ---
    op.create_table(
        'bandeiras_cartao',
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.Column('empresa_id', sa.Uuid(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('forma_pagamento_id', sa.Uuid(), nullable=False),
        sa.Column('nome', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('taxa_debito', sa.Numeric(precision=6, scale=4), nullable=False, server_default=sa.text('0')),
        sa.Column('taxa_credito_1x', sa.Numeric(precision=6, scale=4), nullable=False, server_default=sa.text('0')),
        sa.Column('taxa_credito_2_6x', sa.Numeric(precision=6, scale=4), nullable=False, server_default=sa.text('0')),
        sa.Column('taxa_credito_7_12x', sa.Numeric(precision=6, scale=4), nullable=False, server_default=sa.text('0')),
        sa.Column('prazo_repasse_dias', sa.Integer(), nullable=False, server_default=sa.text('30')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['forma_pagamento_id'], ['formas_pagamento.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_bandeiras_cartao_empresa_id', 'bandeiras_cartao', ['empresa_id'])
    op.create_index('ix_bandeiras_cartao_forma_pagamento_id', 'bandeiras_cartao', ['forma_pagamento_id'])


def downgrade() -> None:
    op.drop_index('ix_bandeiras_cartao_forma_pagamento_id', table_name='bandeiras_cartao')
    op.drop_index('ix_bandeiras_cartao_empresa_id', table_name='bandeiras_cartao')
    op.drop_table('bandeiras_cartao')

    with op.batch_alter_table('formas_pagamento', schema=None) as batch_op:
        batch_op.drop_column('dia_vencimento')
        batch_op.drop_column('dia_fechamento')

    # Nota: PostgreSQL não suporta DROP VALUE de enum; o valor RECEBIMENTO_CARTAO
    # permanece no enum após downgrade (sem impacto funcional).
