"""centro_custos

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-04-24 10:00:00.000000

Cria tabela centros_custo com hierarquia, multi-tenant, unicidade por empresa
e campos de auditoria. Não altera nenhuma tabela contábil existente.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema — Módulo Centro de Custos."""

    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'centros_custo' not in existing_tables:
        # Criação completa da tabela
        op.create_table(
            'centros_custo',
            sa.Column('criado_em', sa.DateTime(), nullable=False),
            sa.Column('atualizado_em', sa.DateTime(), nullable=False),
            sa.Column('empresa_id', sa.Uuid(), nullable=False),
            sa.Column('id', sa.Uuid(), nullable=False),
            sa.Column('codigo', sqlmodel.AutoString(length=50), nullable=False),
            sa.Column('nome', sqlmodel.AutoString(length=100), nullable=False),
            sa.Column('descricao', sqlmodel.AutoString(length=255), nullable=True),
            sa.Column(
                'tipo',
                sa.Enum('SINTETICO', 'ANALITICO', name='tipocentrocusto'),
                nullable=False,
                server_default='ANALITICO'
            ),
            sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('parent_id', sa.Uuid(), nullable=True),
            sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
            sa.ForeignKeyConstraint(['parent_id'], ['centros_custo.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('empresa_id', 'codigo', name='uq_centros_custo_empresa_codigo'),
        )
        op.create_index('ix_centros_custo_empresa_id', 'centros_custo', ['empresa_id'])
    else:
        # Tabela já existe (criada via create_db_and_tables) — migrar para o novo schema
        existing_cols = {c['name'] for c in inspector.get_columns('centros_custo')}

        with op.batch_alter_table('centros_custo', schema=None) as batch_op:
            # Renomear is_active → ativo se necessário
            if 'is_active' in existing_cols and 'ativo' not in existing_cols:
                batch_op.add_column(sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.text('true')))
                batch_op.drop_column('is_active')

            # Adicionar descricao se ausente
            if 'descricao' not in existing_cols:
                batch_op.add_column(sa.Column('descricao', sqlmodel.AutoString(length=255), nullable=True))

        # Adicionar constraint única se não existir
        existing_constraints = {c['name'] for c in inspector.get_unique_constraints('centros_custo')}
        if 'uq_centros_custo_empresa_codigo' not in existing_constraints:
            with op.batch_alter_table('centros_custo', schema=None) as batch_op:
                batch_op.create_unique_constraint('uq_centros_custo_empresa_codigo', ['empresa_id', 'codigo'])

        # Adicionar index se não existir
        existing_indexes = {i['name'] for i in inspector.get_indexes('centros_custo')}
        if 'ix_centros_custo_empresa_id' not in existing_indexes:
            op.create_index('ix_centros_custo_empresa_id', 'centros_custo', ['empresa_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_centros_custo_empresa_id', table_name='centros_custo')
    op.drop_table('centros_custo')

    conn = op.get_bind()
    # Remover enum apenas se não estiver em uso por outra tabela
    conn.execute(sa.text("""
        DO $$ BEGIN
            DROP TYPE IF EXISTS tipocentrocusto;
        EXCEPTION WHEN others THEN null;
        END $$;
    """))
