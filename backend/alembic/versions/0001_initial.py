"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2024-04-04 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role_enum = sa.Enum("USER", "ADMIN", name="user_role")
card_type_enum = sa.Enum("basic", "multiple_choice", "short_answer", "cloze", name="card_type")
quiz_mode_enum = sa.Enum("review", "practice", "exam", name="quiz_mode")
quiz_status_enum = sa.Enum("active", "completed", name="quiz_status")


def upgrade() -> None:
    users = op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("role", user_role_enum, nullable=False, server_default="USER"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.sql.expression.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_index("ix_users_email", "users", ["email"], unique=True)

    decks = op.create_table(
        "decks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), server_default=sa.sql.expression.true(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_index("ix_decks_title", "decks", ["title"])

    tags = op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False, unique=True),
    )

    op.create_index("ix_tags_name", "tags", ["name"], unique=True)

    op.create_table(
        "deck_tags",
        sa.Column("deck_id", sa.Integer(), sa.ForeignKey("decks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", sa.Integer(), sa.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    )

    cards = op.create_table(
        "cards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("deck_id", sa.Integer(), sa.ForeignKey("decks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", card_type_enum, nullable=False, server_default="basic"),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_index("ix_cards_deck_id", "cards", ["deck_id"])

    quiz_sessions = op.create_table(
        "quiz_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("deck_id", sa.Integer(), sa.ForeignKey("decks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mode", quiz_mode_enum, nullable=False),
        sa.Column("status", quiz_status_enum, nullable=False, server_default="active"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("config", sa.JSON(), nullable=True),
    )

    op.create_index("ix_quiz_sessions_user_id", "quiz_sessions", ["user_id"])
    op.create_index("ix_quiz_sessions_deck_id", "quiz_sessions", ["deck_id"])

    op.create_table(
        "quiz_responses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("card_id", sa.Integer(), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_answer", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("quality", sa.Integer(), nullable=True),
        sa.Column("responded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_quiz_responses_session_id", "quiz_responses", ["session_id"])
    op.create_index("ix_quiz_responses_card_id", "quiz_responses", ["card_id"])

    srs_reviews = op.create_table(
        "srs_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("card_id", sa.Integer(), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repetitions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("interval_days", sa.Integer(), server_default="1", nullable=False),
        sa.Column("easiness", sa.Float(), server_default="2.5", nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_quality", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "card_id", name="uq_review_user_card"),
    )

    op.create_index("ix_srs_reviews_user_id", "srs_reviews", ["user_id"])
    op.create_index("ix_srs_reviews_card_id", "srs_reviews", ["card_id"])

    op.create_table(
        "user_deck_progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("deck_id", sa.Integer(), sa.ForeignKey("decks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("percent_complete", sa.Float(), server_default="0", nullable=False),
        sa.Column("last_studied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("streak", sa.Integer(), server_default="0", nullable=False),
        sa.Column("pinned", sa.Boolean(), server_default=sa.sql.expression.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "deck_id", name="uq_user_deck"),
    )

    op.create_index("ix_user_deck_progress_user_id", "user_deck_progress", ["user_id"])
    op.create_index("ix_user_deck_progress_deck_id", "user_deck_progress", ["deck_id"])



def downgrade() -> None:
    op.drop_table("user_deck_progress")
    op.drop_table("srs_reviews")
    op.drop_table("quiz_responses")
    op.drop_table("quiz_sessions")
    op.drop_table("cards")
    op.drop_table("deck_tags")
    op.drop_table("tags")
    op.drop_table("decks")
    op.drop_table("users")

    user_role_enum.drop(op.get_bind(), checkfirst=False)
    card_type_enum.drop(op.get_bind(), checkfirst=False)
    quiz_mode_enum.drop(op.get_bind(), checkfirst=False)
    quiz_status_enum.drop(op.get_bind(), checkfirst=False)
