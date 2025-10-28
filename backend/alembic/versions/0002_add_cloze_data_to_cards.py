"""add_cloze_data_to_cards

Revision ID: 0002_add_cloze_data
Revises: 0001_initial
Create Date: 2025-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002_add_cloze_data'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add cloze_data column to cards table
    op.add_column('cards', sa.Column('cloze_data', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remove cloze_data column from cards table
    op.drop_column('cards', 'cloze_data')
