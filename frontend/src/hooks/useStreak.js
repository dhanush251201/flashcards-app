import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
/**
 * Hook to fetch the current user's streak data
 */
export const useStreak = () => {
    return useQuery({
        queryKey: ["streak"],
        queryFn: async () => {
            const { data } = await apiClient.get("/me/streak");
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
