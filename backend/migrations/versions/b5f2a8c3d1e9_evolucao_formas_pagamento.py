"""evolucao_formas_pagamento

Revision ID: b5f2a8c3d1e9
Revises: 21d3115ea191
Create Date: 2026-04-15 19:52:00.000000

Adiciona campos operacionais em formas_pagamento,
cria tabela faturas_cartao e adiciona fatura_cartao_id em lancamentos_financeiros.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'b5f2a8c3d1e9'
down_revision: Union[str, Sequence[str], None] = '21d3115ea191'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # --- Criar enums PostgreSQL ---
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE tipoformapagamento AS ENUM (
                'PIX', 'TRANSFERENCIA', 'BOLETO',
                'CARTAO_DEBITO', 'CARTAO_CREDITO', 'DINHEIRO', 'CHEQUE'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE tipooperacaopagamento AS ENUM (
                'LIQUIDACAO_DIRETA', 'GERACAO_FATURA',
                'COMPENSACAO_BOLETO', 'LIQUIDACAO_DIFERIDA'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE statusfatura AS ENUM (
                'ABERTA', 'FECHADA', 'PAGA', 'CANCELADA'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    # --- Evoluir formas_pagamento ---
    with op.batch_alter_table('formas_pagamento', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'tipo',
            sa.Enum('PIX', 'TRANSFERENCIA', 'BOLETO', 'CARTAO_DEBITO', 'CARTAO_CREDITO',
                    'DINHEIRO', 'CHEQUE', name='tipoformapagamento'),
            nullable=True
        ))
        batch_op.add_column(sa.Column(
            'tipo_operacao',
            sa.Enum('LIQUIDACAO_DIRETA', 'GERACAO_FATURA', 'COMPENSACAO_BOLETO',
                    'LIQUIDACAO_DIFERIDA', name='tipooperacaopagamento'),
            nullable=False,
            server_default='LIQUIDACAO_DIRETA'
        ))
        batch_op.add_column(sa.Column('baixa_imediata', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        batch_op.add_column(sa.Column('gera_obrigacao_futura', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.add_column(sa.Column('prazo_liquidacao_dias', sa.Integer(), nullable=False, server_default=sa.text('0')))
        batch_op.add_column(sa.Column('permite_parcelamento', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.add_column(sa.Column('max_parcelas', sa.Integer(), nullable=False, server_default=sa.text('1')))
        batch_op.add_column(sa.Column(
            'conta_transitoria_id',
            sa.Uuid(),
            sa.ForeignKey('plano_contas.id'),
            nullable=True
        ))

    # --- Criar tabela faturas_cartao ---
    op.create_table(
        'faturas_cartao',
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.Column('empresa_id', sa.Uuid(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('forma_pagamento_id', sa.Uuid(), nullable=False),
        sa.Column('mes_referencia', sa.Date(), nullable=False),
        sa.Column('data_vencimento', sa.Date(), nullable=False),
        sa.Column('data_fechamento', sa.Date(), nullable=False),
        sa.Column('valor_total', sa.Numeric(precision=18, scale=2), nullable=False, server_default=sa.text('0')),
        sa.Column(
            'status',
            sa.Enum('ABERTA', 'FECHADA', 'PAGA', 'CANCELADA', name='statusfatura'),
            nullable=False,
            server_default='ABERTA'
        ),
        sa.Column('lancamento_pagamento_id', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['forma_pagamento_id'], ['formas_pagamento.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_faturas_cartao_empresa_id', 'faturas_cartao', ['empresa_id'])
    op.create_index('ix_faturas_cartao_forma_pagamento_id', 'faturas_cartao', ['forma_pagamento_id'])
    op.create_index('ix_faturas_cartao_mes_referencia', 'faturas_cartao', ['mes_referencia'])
    op.create_index('ix_faturas_cartao_status', 'faturas_cartao', ['status'])

    # --- Evoluir lancamentos_financeiros ---
    with op.batch_alter_table('lancamentos_financeiros', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fatura_cartao_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_lancamento_fatura_cartao',
            'faturas_cartao',
            ['fatura_cartao_id'], ['id']
        )
        batch_op.create_index('ix_lancamentos_financeiros_fatura_cartao_id', ['fatura_cartao_id'])

    # --- FK circular: faturas_cartao.lancamento_pagamento_id → lancamentos_financeiros ---
    op.create_foreign_key(
        'fk_fatura_lancamento_pagamento',
        'faturas_cartao',
        'lancamentos_financeiros',
        ['lancamento_pagamento_id'], ['id'],
        use_alter=True
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Remover FK circular
    op.drop_constraint('fk_fatura_lancamento_pagamento', 'faturas_cartao', type_='foreignkey')

    # Reverter lancamentos_financeiros
    with op.batch_alter_table('lancamentos_financeiros', schema=None) as batch_op:
        batch_op.drop_index('ix_lancamentos_financeiros_fatura_cartao_id')
        batch_op.drop_constraint('fk_lancamento_fatura_cartao', type_='foreignkey')
        batch_op.drop_column('fatura_cartao_id')

    # Remover tabela faturas_cartao
    op.drop_index('ix_faturas_cartao_status', table_name='faturas_cartao')
    op.drop_index('ix_faturas_cartao_mes_referencia', table_name='faturas_cartao')
    op.drop_index('ix_faturas_cartao_forma_pagamento_id', table_name='faturas_cartao')
    op.drop_index('ix_faturas_cartao_empresa_id', table_name='faturas_cartao')
    op.drop_table('faturas_cartao')

    # Reverter formas_pagamento
    with op.batch_alter_table('formas_pagamento', schema=None) as batch_op:
        batch_op.drop_column('conta_transitoria_id')
        batch_op.drop_column('max_parcelas')
        batch_op.drop_column('permite_parcelamento')
        batch_op.drop_column('prazo_liquidacao_dias')
        batch_op.drop_column('gera_obrigacao_futura')
        batch_op.drop_column('baixa_imediata')
        batch_op.drop_column('tipo_operacao')
        batch_op.drop_column('tipo')

    # Remover enums PostgreSQL
    op.execute("DROP TYPE IF EXISTS statusfatura")
    op.execute("DROP TYPE IF EXISTS tipooperacaopagamento")
    op.execute("DROP TYPE IF EXISTS tipoformapagamento")
