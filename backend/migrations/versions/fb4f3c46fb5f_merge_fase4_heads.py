"""merge_fase4_heads

Revision ID: fb4f3c46fb5f
Revises: a3f9c2b1d4e7, c4a7f1b2e3d8, c6e3a1f9b2d5, d9e4b2a1c3f7
Create Date: 2026-04-16 20:26:48.309181

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'fb4f3c46fb5f'
down_revision: Union[str, Sequence[str], None] = ('a3f9c2b1d4e7', 'c4a7f1b2e3d8', 'c6e3a1f9b2d5', 'd9e4b2a1c3f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
