"""add_is_correct_to_quiz_responses

Revision ID: 0003_add_is_correct
Revises: 0002_add_cloze_data
Create Date: 2025-11-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003_add_is_correct'
down_revision: Union[str, None] = '0002_add_cloze_data'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_correct column to quiz_responses table
    op.add_column('quiz_responses', sa.Column('is_correct', sa.Boolean(), nullable=True))


def downgrade() -> None:
    # Remove is_correct column from quiz_responses table
    op.drop_column('quiz_responses', 'is_correct')
