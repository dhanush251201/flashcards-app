# Flash-Decks Documentation

Welcome to the comprehensive documentation for **Flash-Decks**, a modern full-stack flashcard application built with spaced repetition learning at its core.

## What is Flash-Decks?

Flash-Decks is an intelligent learning platform that helps you master any subject through scientifically-proven spaced repetition. Using the SM-2 (SuperMemo-2) algorithm, the application optimizes your study schedule by showing you cards exactly when you're about to forget them, maximizing retention and minimizing study time.

## Key Features

- **Smart Spaced Repetition**: SM-2 algorithm automatically schedules reviews based on your performance
- **Multiple Card Types**: Basic, Multiple Choice, Short Answer, and Cloze Deletion
- **Flexible Study Modes**: Review (SRS), Practice, and Exam modes
- **Progress Tracking**: Detailed statistics, streaks, and completion percentages
- **Modern UI**: Beautiful glassmorphism design with dark/light theme support
- **Secure Authentication**: JWT-based auth with automatic token refresh
- **Public & Private Decks**: Share your decks or keep them private

## Documentation Structure

### Getting Started

Perfect for new users and developers setting up the project:

- [Installation Guide](./getting-started/installation.md) - Set up your development environment
- [Quick Start](./getting-started/quick-start.md) - Get up and running in minutes
- [Configuration](./getting-started/configuration.md) - Environment variables and settings

### Architecture

Deep dive into the technical design and structure:

- [Architecture Overview](./architecture/overview.md) - High-level system design
- [Backend Architecture](./architecture/backend-architecture.md) - FastAPI service layer
- [Frontend Architecture](./architecture/frontend-architecture.md) - React application structure
- [Database Schema](./architecture/database-schema.md) - Complete data model

### Features

Detailed explanations of all major features:

- [Authentication System](./features/authentication.md) - User auth and security
- [Deck Management](./features/deck-management.md) - Creating and organizing decks
- [Study Modes](./features/study-modes.md) - Review, Practice, and Exam modes
- [Spaced Repetition](./features/spaced-repetition.md) - SM-2 algorithm implementation
- [Card Types](./features/card-types.md) - All supported flashcard formats
- [Streak System](./features/streak-system.md) - Daily study tracking

### API Reference

Complete API documentation for developers:

- [API Overview](./api/overview.md) - Authentication, rate limits, and conventions
- [Authentication Endpoints](./api/authentication-endpoints.md) - Login, signup, refresh
- [Deck Endpoints](./api/deck-endpoints.md) - Deck and card CRUD operations
- [Study Endpoints](./api/study-endpoints.md) - Study sessions and reviews
- [User Endpoints](./api/user-endpoints.md) - User profile and settings

### Development

Guidelines for contributing and development workflows:

- [Development Setup](./development/setup.md) - Local development environment
- [Testing Guide](./development/testing.md) - Running and writing tests
- [Contributing](./development/contributing.md) - How to contribute
- [CI/CD Pipeline](./development/ci-cd.md) - Continuous integration details

### Deployment

Production deployment and infrastructure:

- [Docker Deployment](./deployment/docker.md) - Using Docker Compose
- [Production Guide](./deployment/production.md) - Best practices for production
- [Environment Variables](./deployment/environment-variables.md) - Configuration reference

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLModel** - SQL databases in Python with type safety
- **PostgreSQL 15** - Robust relational database
- **Alembic** - Database migration tool
- **Passlib** - Secure password hashing with Argon2
- **JWT** - Stateless authentication tokens

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **React Query** - Server state management
- **React Router v6** - Client-side routing

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **GitHub Actions** - CI/CD automation
- **Nginx** - Production web server

## Quick Links

- [GitHub Repository](https://github.com/yourusername/flashcardApplication)
- [Report Issues](https://github.com/yourusername/flashcardApplication/issues)
- [Main README](../README.md)

## Getting Help

- Check the relevant documentation section above
- Search through existing [GitHub Issues](https://github.com/yourusername/flashcardApplication/issues)
- Create a new issue with the appropriate template

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Ready to get started?** Head over to the [Installation Guide](./getting-started/installation.md) to set up your development environment!
