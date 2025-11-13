/**
 * Flag/Unflag button component for marking cards for review
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FlagIcon } from "@heroicons/react/24/outline";
import { FlagIcon as FlagIconSolid } from "@heroicons/react/24/solid";
import { flaggedCardsApi } from "@/lib/flaggedCardsApi";

interface FlagButtonProps {
  cardId: number;
  deckId: number;
  isFlagged: boolean;
  onFlagChange?: (isFlagged: boolean) => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const FlagButton = ({
  cardId,
  deckId,
  isFlagged,
  onFlagChange,
  size = "md",
  showLabel = false
}: FlagButtonProps) => {
  const queryClient = useQueryClient();

  const flagMutation = useMutation({
    mutationFn: () => flaggedCardsApi.flagCard(cardId, deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flaggedCards", deckId] });
      queryClient.invalidateQueries({ queryKey: ["flaggedCardIds", deckId] });
      queryClient.invalidateQueries({ queryKey: ["flaggedCount", deckId] });
      queryClient.invalidateQueries({ queryKey: ["flaggedCounts"] });
      onFlagChange?.(true);
    }
  });

  const unflagMutation = useMutation({
    mutationFn: () => flaggedCardsApi.unflagCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flaggedCards", deckId] });
      queryClient.invalidateQueries({ queryKey: ["flaggedCardIds", deckId] });
      queryClient.invalidateQueries({ queryKey: ["flaggedCount", deckId] });
      queryClient.invalidateQueries({ queryKey: ["flaggedCounts"] });
      onFlagChange?.(false);
    }
  });

  const handleClick = () => {
    if (isFlagged) {
      unflagMutation.mutate();
    } else {
      flagMutation.mutate();
    }
  };

  const isLoading = flagMutation.isPending || unflagMutation.isPending;

  // Size classes
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3"
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const Icon = isFlagged ? FlagIconSolid : FlagIcon;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        inline-flex items-center gap-2
        rounded-lg
        ${
          isFlagged
            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
        }
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
      title={isFlagged ? "Unflag this card" : "Flag this card for review"}
      aria-label={isFlagged ? "Unflag card" : "Flag card"}
    >
      <Icon className={iconSizeClasses[size]} />
      {showLabel && (
        <span className="text-sm font-medium">{isFlagged ? "Flagged" : "Flag"}</span>
      )}
    </button>
  );
};
