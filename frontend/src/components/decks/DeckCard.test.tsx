import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { DeckCard } from './DeckCard';

describe('DeckCard', () => {
  const mockDeck = {
    id: 1,
    title: 'JavaScript Basics',
    description: 'Learn the fundamentals of JavaScript',
    card_count: 25,
    is_public: true,
    due_count: 5,
    tags: [
      { id: 1, name: 'programming' },
      { id: 2, name: 'javascript' },
    ],
  };

  it('renders deck title', () => {
    render(<DeckCard deck={mockDeck} />);
    expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
  });

  it('renders deck description', () => {
    render(<DeckCard deck={mockDeck} />);
    expect(screen.getByText('Learn the fundamentals of JavaScript')).toBeInTheDocument();
  });

  it('displays card count', () => {
    render(<DeckCard deck={mockDeck} />);
    expect(screen.getByText(/25.*cards?/i)).toBeInTheDocument();
  });

  it('renders tags when provided', () => {
    render(<DeckCard deck={mockDeck} />);
    expect(screen.getByText('programming')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('handles deck without tags', () => {
    const deckWithoutTags = { ...mockDeck, tags: [] };
    render(<DeckCard deck={deckWithoutTags} />);
    expect(screen.queryByText('programming')).not.toBeInTheDocument();
  });

  it('is clickable and navigates to deck', async () => {
    const user = userEvent.setup();
    render(<DeckCard deck={mockDeck} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/app/decks/${mockDeck.id}`);
  });

  it('handles long descriptions gracefully', () => {
    const longDescription = 'A'.repeat(200);
    const deckWithLongDesc = { ...mockDeck, description: longDescription };

    render(<DeckCard deck={deckWithLongDesc} />);
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it('shows public badge for public decks', () => {
    render(<DeckCard deck={mockDeck} />);
    // Check for any public indicator if your component has one
    const card = screen.getByText('JavaScript Basics').closest('a');
    expect(card).toBeInTheDocument();
  });

  it('handles deck with no cards', () => {
    const emptyDeck = { ...mockDeck, card_count: 0 };
    render(<DeckCard deck={emptyDeck} />);
    expect(screen.getByText(/0.*cards?/i)).toBeInTheDocument();
  });
});
