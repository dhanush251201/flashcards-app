/**
 * API functions for flagged cards functionality
 */
import { apiClient } from "./apiClient";
export const flaggedCardsApi = {
    /**
     * Flag a card for review
     */
    flagCard: async (cardId, deckId) => {
        const response = await apiClient.post("/flagged-cards", {
            card_id: cardId,
            deck_id: deckId
        });
        return response.data;
    },
    /**
     * Unflag a previously flagged card
     */
    unflagCard: async (cardId) => {
        await apiClient.delete(`/flagged-cards/${cardId}`);
    },
    /**
     * Get all flagged cards for a specific deck
     */
    getFlaggedCardsForDeck: async (deckId) => {
        const response = await apiClient.get(`/flagged-cards/deck/${deckId}`);
        return response.data;
    },
    /**
     * Get IDs of flagged cards for a specific deck
     */
    getFlaggedCardIds: async (deckId) => {
        const response = await apiClient.get(`/flagged-cards/deck/${deckId}/ids`);
        return response.data;
    },
    /**
     * Check if a specific card is flagged
     */
    isCardFlagged: async (cardId) => {
        const response = await apiClient.get(`/flagged-cards/check/${cardId}`);
        return response.data.is_flagged;
    },
    /**
     * Get count of flagged cards for all decks
     */
    getFlaggedCountsByDeck: async () => {
        const response = await apiClient.get("/flagged-cards/counts");
        return response.data.counts;
    },
    /**
     * Get count of flagged cards for a specific deck
     */
    getFlaggedCountForDeck: async (deckId) => {
        const response = await apiClient.get(`/flagged-cards/deck/${deckId}/count`);
        return response.data.count;
    }
};
