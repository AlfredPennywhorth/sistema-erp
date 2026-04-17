"""modulo_contabil_templates

Revision ID: f1a2b3c4d5e6
Revises: fb4f3c46fb5f
Create Date: 2026-04-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'fb4f3c46fb5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema — Módulo Contábil: templates, lotes e rastreabilidade."""

    # 1. Tabela de templates de plano de contas (global, sem empresa_id)
    op.create_table(
        'modelos_plano_contas',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('codigo', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('nome', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('atividade_economica', sqlmodel.AutoString(), nullable=False),
        sa.Column('versao', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('descricao', sqlmodel.AutoString(), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_modelos_plano_contas_atividade_economica'), 'modelos_plano_contas', ['atividade_economica'], unique=False)
    op.create_index(op.f('ix_modelos_plano_contas_codigo'), 'modelos_plano_contas', ['codigo'], unique=False)

    # 2. Itens de templates de plano de contas
    op.create_table(
        'modelos_plano_contas_itens',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('modelo_id', sa.Uuid(), nullable=False),
        sa.Column('codigo_estruturado', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('nome', sqlmodel.AutoString(length=100), nullable=False),
        sa.Column('tipo', sqlmodel.AutoString(), nullable=False),
        sa.Column('natureza', sqlmodel.AutoString(), nullable=False),
        sa.Column('is_analitica', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('parent_codigo', sqlmodel.AutoString(length=50), nullable=True),
        sa.Column('is_required', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['modelo_id'], ['modelos_plano_contas.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_modelos_plano_contas_itens_modelo_id'), 'modelos_plano_contas_itens', ['modelo_id'], unique=False)

    # 3. Novos campos em plano_contas (rastreabilidade de template)
    with op.batch_alter_table('plano_contas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('template_conta_origem_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('origem', sqlmodel.AutoString(length=20), nullable=False, server_default='MANUAL'))
        batch_op.add_column(sa.Column('is_required', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.create_foreign_key(
            'fk_plano_contas_template_item',
            'modelos_plano_contas_itens',
            ['template_conta_origem_id'], ['id']
        )

    # 4. Novos campos em empresas (módulo contábil)
    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('atividade_economica', sqlmodel.AutoString(), nullable=True))
        batch_op.add_column(sa.Column('modulo_contabil_ativo', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.add_column(sa.Column('plano_contas_template_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('plano_contas_template_versao', sa.Integer(), nullable=True))

    # 5. Tabela de lotes contábeis
    op.create_table(
        'lotes_contabeis',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('empresa_id', sa.Uuid(), nullable=False),
        sa.Column('data_lancamento', sa.Date(), nullable=False),
        sa.Column('historico', sqlmodel.AutoString(length=500), nullable=False),
        sa.Column('documento_referencia', sqlmodel.AutoString(length=100), nullable=True),
        sa.Column('modulo_origem', sqlmodel.AutoString(length=50), nullable=False, server_default='MANUAL'),
        sa.Column('lancamento_financeiro_id', sa.Uuid(), nullable=True),
        sa.Column('usuario_id', sa.Uuid(), nullable=True),
        sa.Column('status', sqlmodel.AutoString(), nullable=False, server_default='ABERTO'),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['lancamento_financeiro_id'], ['lancamentos_financeiros.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lotes_contabeis_empresa_id'), 'lotes_contabeis', ['empresa_id'], unique=False)
    op.create_index(op.f('ix_lotes_contabeis_data_lancamento'), 'lotes_contabeis', ['data_lancamento'], unique=False)
    op.create_index(op.f('ix_lotes_contabeis_lancamento_financeiro_id'), 'lotes_contabeis', ['lancamento_financeiro_id'], unique=False)
    op.create_index(op.f('ix_lotes_contabeis_status'), 'lotes_contabeis', ['status'], unique=False)

    # 6. Adicionar coluna lote_id em journal_entries (nullable — não quebra dados existentes)
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.add_column(sa.Column('lote_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_journal_entry_lote',
            'lotes_contabeis',
            ['lote_id'], ['id']
        )
        batch_op.create_index('ix_journal_entries_lote_id', ['lote_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""

    # Remover lote_id de journal_entries
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.drop_index('ix_journal_entries_lote_id')
        batch_op.drop_constraint('fk_journal_entry_lote', type_='foreignkey')
        batch_op.drop_column('lote_id')

    # Remover tabela lotes_contabeis
    op.drop_index(op.f('ix_lotes_contabeis_status'), table_name='lotes_contabeis')
    op.drop_index(op.f('ix_lotes_contabeis_lancamento_financeiro_id'), table_name='lotes_contabeis')
    op.drop_index(op.f('ix_lotes_contabeis_data_lancamento'), table_name='lotes_contabeis')
    op.drop_index(op.f('ix_lotes_contabeis_empresa_id'), table_name='lotes_contabeis')
    op.drop_table('lotes_contabeis')

    # Remover campos de empresas
    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.drop_column('plano_contas_template_versao')
        batch_op.drop_column('plano_contas_template_id')
        batch_op.drop_column('modulo_contabil_ativo')
        batch_op.drop_column('atividade_economica')

    # Remover campos de plano_contas
    with op.batch_alter_table('plano_contas', schema=None) as batch_op:
        batch_op.drop_constraint('fk_plano_contas_template_item', type_='foreignkey')
        batch_op.drop_column('is_required')
        batch_op.drop_column('origem')
        batch_op.drop_column('template_conta_origem_id')

    # Remover tabelas de templates
    op.drop_index(op.f('ix_modelos_plano_contas_itens_modelo_id'), table_name='modelos_plano_contas_itens')
    op.drop_table('modelos_plano_contas_itens')
    op.drop_index(op.f('ix_modelos_plano_contas_codigo'), table_name='modelos_plano_contas')
    op.drop_index(op.f('ix_modelos_plano_contas_atividade_economica'), table_name='modelos_plano_contas')
    op.drop_table('modelos_plano_contas')
