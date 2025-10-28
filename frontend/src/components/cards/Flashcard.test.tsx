import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Flashcard } from './Flashcard';
import type { Card } from '@/types/api';

describe('Flashcard', () => {
  const mockBasicCard: Card = {
    id: 1,
    deck_id: 1,
    type: 'basic',
    prompt: 'What is React?',
    answer: 'A JavaScript library for building user interfaces',
    explanation: 'React is maintained by Meta',
    options: null,
    cloze_data: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockClozeCard: Card = {
    ...mockBasicCard,
    id: 2,
    type: 'cloze',
    prompt: 'The capital of France is [BLANK]',
    answer: 'Paris',
    cloze_data: { blanks: [{ answer: 'Paris' }] },
  };

  describe('Basic functionality', () => {
    it('renders the card prompt initially', () => {
      render(<Flashcard card={mockBasicCard} />);
      expect(screen.getByText('What is React?')).toBeInTheDocument();
      expect(screen.getByText('Prompt')).toBeInTheDocument();
    });

    it('shows "Tap to flip" hint', () => {
      render(<Flashcard card={mockBasicCard} />);
      expect(screen.getByText('Tap to flip')).toBeInTheDocument();
    });

    it('displays card type', () => {
      render(<Flashcard card={mockBasicCard} />);
      expect(screen.getByText('basic')).toBeInTheDocument();
    });
  });

  describe('Flipping behavior - uncontrolled', () => {
    it('flips to show answer when clicked', async () => {
      const user = userEvent.setup();
      render(<Flashcard card={mockBasicCard} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('Answer')).toBeInTheDocument();
      expect(screen.getByText('A JavaScript library for building user interfaces')).toBeInTheDocument();
    });

    it('shows explanation when available', async () => {
      const user = userEvent.setup();
      render(<Flashcard card={mockBasicCard} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('React is maintained by Meta')).toBeInTheDocument();
    });

    it('flips back to prompt when clicked again', async () => {
      const user = userEvent.setup();
      render(<Flashcard card={mockBasicCard} />);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);

      expect(screen.getByText('Prompt')).toBeInTheDocument();
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });
  });

  describe('Flipping behavior - controlled', () => {
    it('uses controlled flipped prop', () => {
      render(<Flashcard card={mockBasicCard} flipped={true} />);

      expect(screen.getByText('Answer')).toBeInTheDocument();
      expect(screen.queryByText('Prompt')).not.toBeInTheDocument();
    });

    it('calls onToggle when clicked in controlled mode', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(<Flashcard card={mockBasicCard} flipped={false} onToggle={onToggle} />);

      await user.click(screen.getByRole('button'));

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('does not flip internally when controlled', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(<Flashcard card={mockBasicCard} flipped={false} onToggle={onToggle} />);

      await user.click(screen.getByRole('button'));

      // Should still show prompt because flipped prop didn't change
      expect(screen.getByText('Prompt')).toBeInTheDocument();
    });
  });

  describe('Cloze card rendering', () => {
    it('renders blank placeholders for cloze cards', () => {
      render(<Flashcard card={mockClozeCard} />);

      expect(screen.getByText('The capital of France is')).toBeInTheDocument();
      expect(screen.getByText('____')).toBeInTheDocument();
    });

    it('shows answer when cloze card is flipped', async () => {
      const user = userEvent.setup();
      render(<Flashcard card={mockClozeCard} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
  });

  describe('Card without explanation', () => {
    it('does not show explanation section if not provided', async () => {
      const user = userEvent.setup();
      const cardWithoutExplanation: Card = {
        ...mockBasicCard,
        explanation: null,
      };

      render(<Flashcard card={cardWithoutExplanation} />);
      await user.click(screen.getByRole('button'));

      expect(screen.queryByText('React is maintained by Meta')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<Flashcard card={mockBasicCard} />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });

    it('has proper button role', () => {
      render(<Flashcard card={mockBasicCard} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
