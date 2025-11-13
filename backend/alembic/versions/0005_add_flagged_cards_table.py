"""add_flagged_cards_table

Revision ID: 0005_add_flagged_cards
Revises: 0004_add_llm_settings
Create Date: 2025-11-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0005_add_flagged_cards'
down_revision: Union[str, None] = '0004_add_llm_settings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create flagged_cards table
    op.create_table(
        'flagged_cards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), nullable=False),
        sa.Column('deck_id', sa.Integer(), nullable=False),
        sa.Column('flagged_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['card_id'], ['cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['deck_id'], ['decks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'card_id', name='uix_user_card_flag')
    )

    # Create indexes for better query performance
    op.create_index('ix_flagged_cards_user_id', 'flagged_cards', ['user_id'])
    op.create_index('ix_flagged_cards_deck_id', 'flagged_cards', ['deck_id'])
    op.create_index('ix_flagged_cards_card_id', 'flagged_cards', ['card_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_flagged_cards_card_id', table_name='flagged_cards')
    op.drop_index('ix_flagged_cards_deck_id', table_name='flagged_cards')
    op.drop_index('ix_flagged_cards_user_id', table_name='flagged_cards')

    # Drop table
    op.drop_table('flagged_cards')
