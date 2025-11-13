from enum import Enum


class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class CardType(str, Enum):
    BASIC = "basic"
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    CLOZE = "cloze"


class QuizMode(str, Enum):
    REVIEW = "review"
    PRACTICE = "practice"
    EXAM = "exam"
    FLAGGED = "flagged"


class QuizStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"

