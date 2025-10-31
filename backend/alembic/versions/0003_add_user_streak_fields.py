"""add_user_streak_fields

Revision ID: 0003_add_user_streak
Revises: 0002_add_cloze_data
Create Date: 2025-10-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003_add_user_streak'
down_revision: Union[str, None] = '0002_add_cloze_data'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add streak tracking columns to users table
    op.add_column('users', sa.Column('current_streak', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('longest_streak', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_activity_date', sa.Date(), nullable=True))


def downgrade() -> None:
    # Remove streak tracking columns from users table
    op.drop_column('users', 'last_activity_date')
    op.drop_column('users', 'longest_streak')
    op.drop_column('users', 'current_streak')
