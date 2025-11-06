"""add_llm_settings_to_users

Revision ID: 0004_add_llm_settings
Revises: 0003_add_is_correct
Create Date: 2025-11-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0004_add_llm_settings'
down_revision: Union[str, None] = '0003_add_is_correct'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add LLM settings columns to users table
    op.add_column('users', sa.Column('openai_api_key', sa.String(), nullable=True))
    op.add_column('users', sa.Column('llm_provider_preference', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove LLM settings columns from users table
    op.drop_column('users', 'llm_provider_preference')
    op.drop_column('users', 'openai_api_key')
