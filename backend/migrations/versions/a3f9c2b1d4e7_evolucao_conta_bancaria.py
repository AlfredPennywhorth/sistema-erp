"""evolucao_conta_bancaria

Revision ID: a3f9c2b1d4e7
Revises: 21d3115ea191
Create Date: 2026-04-15 19:30:00.000000

Adds tipo_conta, limite_credito, conta_contabil_id, ativo to contas_bancarias.
conta_contabil_id is intentionally NULLABLE to allow safe migration of existing rows.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a3f9c2b1d4e7'
down_revision: Union[str, Sequence[str], None] = '21d3115ea191'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('contas_bancarias', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'tipo_conta',
                sa.String(length=20),
                server_default='CORRENTE',
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column(
                'limite_credito',
                sa.Numeric(precision=18, scale=2),
                server_default='0',
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column(
                'conta_contabil_id',
                sa.Uuid(),
                nullable=True,  # NULLABLE: backfill existing rows before adding NOT NULL
            )
        )
        batch_op.add_column(
            sa.Column(
                'ativo',
                sa.Boolean(),
                server_default=sa.text('true'),
                nullable=False,
            )
        )
        batch_op.create_foreign_key(
            'fk_contas_bancarias_conta_contabil',
            'plano_contas',
            ['conta_contabil_id'],
            ['id'],
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('contas_bancarias', schema=None) as batch_op:
        batch_op.drop_constraint('fk_contas_bancarias_conta_contabil', type_='foreignkey')
        batch_op.drop_column('ativo')
        batch_op.drop_column('conta_contabil_id')
        batch_op.drop_column('limite_credito')
        batch_op.drop_column('tipo_conta')
