/**
 * API functions for flagged cards functionality
 */

import { apiClient } from "./apiClient";
import type { Card, FlaggedCard } from "@/types/api";

export const flaggedCardsApi = {
  /**
   * Flag a card for review
   */
  flagCard: async (cardId: number, deckId: number): Promise<FlaggedCard> => {
    const response = await apiClient.post<FlaggedCard>("/flagged-cards", {
      card_id: cardId,
      deck_id: deckId
    });
    return response.data;
  },

  /**
   * Unflag a previously flagged card
   */
  unflagCard: async (cardId: number): Promise<void> => {
    await apiClient.delete(`/flagged-cards/${cardId}`);
  },

  /**
   * Get all flagged cards for a specific deck
   */
  getFlaggedCardsForDeck: async (deckId: number): Promise<Card[]> => {
    const response = await apiClient.get<Card[]>(`/flagged-cards/deck/${deckId}`);
    return response.data;
  },

  /**
   * Get IDs of flagged cards for a specific deck
   */
  getFlaggedCardIds: async (deckId: number): Promise<number[]> => {
    const response = await apiClient.get<number[]>(`/flagged-cards/deck/${deckId}/ids`);
    return response.data;
  },

  /**
   * Check if a specific card is flagged
   */
  isCardFlagged: async (cardId: number): Promise<boolean> => {
    const response = await apiClient.get<{ is_flagged: boolean }>(`/flagged-cards/check/${cardId}`);
    return response.data.is_flagged;
  },

  /**
   * Get count of flagged cards for all decks
   */
  getFlaggedCountsByDeck: async (): Promise<Record<number, number>> => {
    const response = await apiClient.get<{ counts: Record<number, number> }>("/flagged-cards/counts");
    return response.data.counts;
  },

  /**
   * Get count of flagged cards for a specific deck
   */
  getFlaggedCountForDeck: async (deckId: number): Promise<number> => {
    const response = await apiClient.get<{ count: number }>(`/flagged-cards/deck/${deckId}/count`);
    return response.data.count;
  }
};
