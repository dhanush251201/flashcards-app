import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dayjs } from "@/lib/dayjs";
import { BookmarkIcon, ChartBarIcon, FireIcon, PlayCircleIcon, PlusIcon, RectangleStackIcon } from "@heroicons/react/24/outline";
import { DeckCard } from "@/components/decks/DeckCard";
import { apiClient } from "@/lib/apiClient";
const activityHeatmap = Array.from({ length: 7 }, (_, index) => {
    const date = dayjs().subtract(index, "day");
    return {
        date: date.format("YYYY-MM-DD"),
        count: Math.floor(Math.random() * 20)
    };
});
export const DashboardPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [isCreateDeckOpen, setCreateDeckOpen] = useState(false);
    const [newDeckTitle, setNewDeckTitle] = useState("");
    const [newDeckDescription, setNewDeckDescription] = useState("");
    const [newDeckTags, setNewDeckTags] = useState("");
    const viewFilter = searchParams.get("view");
    const { data: decks = [] } = useQuery({
        queryKey: ["decks", viewFilter],
        queryFn: async () => {
            const { data } = await apiClient.get("/decks");
            return data;
        }
    });
    const { data: dueCards = [] } = useQuery({
        queryKey: ["due-review"],
        queryFn: async () => {
            const { data } = await apiClient.get("/study/reviews/due");
            return data;
        }
    });
    const createDeckMutation = useMutation({
        mutationFn: async () => {
            const tagNames = newDeckTags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);
            const { data } = await apiClient.post("/decks", {
                title: newDeckTitle,
                description: newDeckDescription,
                tag_names: tagNames
            });
            return data;
        },
        onSuccess: () => {
            setCreateDeckOpen(false);
            setNewDeckTitle("");
            setNewDeckDescription("");
            setNewDeckTags("");
            queryClient.invalidateQueries({ queryKey: ["decks"] });
        }
    });
    const filteredDecks = useMemo(() => {
        if (viewFilter === "due") {
            return decks.filter((deck) => deck.due_count > 0);
        }
        if (viewFilter === "pinned") {
            // Filter pinned decks when backend support is added
            return decks.filter((deck) => deck.is_pinned);
        }
        return decks;
    }, [decks, viewFilter]);
    const totalDue = dueCards.length;
    const totalDecks = decks.length;
    const totalCards = decks.reduce((sum, deck) => sum + deck.card_count, 0);
    // Dashboard view - Overview with stats and quick actions
    if (!viewFilter) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-6 pb-10 lg:grid-cols-[1fr,300px]", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white shadow-lg shadow-brand-500/30", children: [_jsx(FireIcon, { className: "size-8 opacity-80" }), _jsx("p", { className: "mt-4 text-3xl font-bold", children: totalDue }), _jsx("p", { className: "mt-1 text-sm opacity-90", children: "Cards due today" })] }), _jsxs("div", { className: "rounded-2xl bg-white p-6 shadow-card dark:bg-slate-900", children: [_jsx(RectangleStackIcon, { className: "size-8 text-slate-400" }), _jsx("p", { className: "mt-4 text-3xl font-bold text-slate-900 dark:text-white", children: totalDecks }), _jsx("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: "Active decks" })] }), _jsxs("div", { className: "rounded-2xl bg-white p-6 shadow-card dark:bg-slate-900", children: [_jsx(ChartBarIcon, { className: "size-8 text-slate-400" }), _jsx("p", { className: "mt-4 text-3xl font-bold text-slate-900 dark:text-white", children: totalCards }), _jsx("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: "Total cards" })] })] }), _jsxs("div", { className: "rounded-2xl bg-white p-6 shadow-card dark:bg-slate-900", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: "Quick start" }), _jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-2", children: [_jsxs("button", { type: "button", onClick: () => {
                                                        const dueDeck = decks.find((deck) => deck.due_count > 0);
                                                        if (!dueDeck) {
                                                            alert("No decks have cards due right now. Create or study a deck first.");
                                                            return;
                                                        }
                                                        apiClient
                                                            .post("/study/sessions", { deck_id: dueDeck.id, mode: "review", config: { endless: false } })
                                                            .then((response) => {
                                                            window.location.href = `/app/study/${response.data.id}`;
                                                        })
                                                            .catch(() => {
                                                            alert("Unable to start a review session right now. Please try again later.");
                                                        });
                                                    }, className: "flex items-center gap-3 rounded-xl border-2 border-brand-200 bg-brand-50 p-4 text-left transition hover:border-brand-400 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:hover:border-brand-500/50", children: [_jsx(PlayCircleIcon, { className: "size-8 text-brand-600 dark:text-brand-400" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-900 dark:text-white", children: "Start Review" }), _jsx("p", { className: "text-xs text-slate-600 dark:text-slate-400", children: "Study due cards" })] })] }), _jsxs("button", { type: "button", onClick: () => setCreateDeckOpen(true), className: "flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600", children: [_jsx(PlusIcon, { className: "size-8 text-slate-600 dark:text-slate-400" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-900 dark:text-white", children: "New Deck" }), _jsx("p", { className: "text-xs text-slate-600 dark:text-slate-400", children: "Create flashcards" })] })] })] })] }), _jsxs("div", { children: [_jsx("h2", { className: "mb-4 text-lg font-semibold text-slate-900 dark:text-white", children: "Recommended for you" }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [decks.slice(0, 4).map((deck) => (_jsx(DeckCard, { deck: deck }, deck.id))), decks.length === 0 && (_jsx("div", { className: "col-span-2 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No decks yet. Create your first deck to start studying." }))] })] })] }), _jsxs("aside", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-2xl bg-white p-5 shadow-card dark:bg-slate-900", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Activity" }), _jsx("span", { className: "text-xs text-slate-400", children: "7 days" })] }), _jsx("div", { className: "space-y-2", children: activityHeatmap.reverse().map((entry) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 text-xs text-slate-500", children: dayjs(entry.date).format("ddd") }), _jsx("div", { className: "h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", children: _jsx("div", { className: "h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600", style: { width: `${Math.min(entry.count * 5, 100)}%` } }) }), _jsx("div", { className: "w-8 text-right text-xs font-semibold text-brand-600 dark:text-brand-400", children: entry.count })] }, entry.date))) })] }), dueCards.length > 0 && (_jsxs("div", { className: "rounded-2xl bg-white p-5 shadow-card dark:bg-slate-900", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-slate-900 dark:text-white", children: "Coming up" }), _jsx("div", { className: "space-y-2", children: dueCards.slice(0, 3).map((item) => (_jsxs("div", { className: "rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60", children: [_jsxs("p", { className: "font-medium text-slate-700 dark:text-slate-300", children: ["Deck ", item.deck_id] }), _jsx("p", { className: "mt-1 text-[11px] text-brand-600 dark:text-brand-400", children: dayjs(item.due_at).fromNow() })] }, `${item.deck_id}-${item.card_id}`))) })] }))] })] }), _jsx(CreateDeckModal, { isOpen: isCreateDeckOpen, onClose: () => setCreateDeckOpen(false), newDeckTitle: newDeckTitle, setNewDeckTitle: setNewDeckTitle, newDeckDescription: newDeckDescription, setNewDeckDescription: setNewDeckDescription, newDeckTags: newDeckTags, setNewDeckTags: setNewDeckTags, createDeckMutation: createDeckMutation })] }));
    }
    // All Decks view - Full grid layout
    if (viewFilter === "all") {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-6 pb-10", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: "All Decks" }), _jsxs("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: ["Browse and manage your ", totalDecks, " deck", totalDecks !== 1 ? "s" : ""] })] }), _jsxs("button", { type: "button", onClick: () => setCreateDeckOpen(true), className: "flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600", children: [_jsx(PlusIcon, { className: "size-4" }), "New Deck"] })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: [decks.map((deck) => (_jsx(DeckCard, { deck: deck }, deck.id))), decks.length === 0 && (_jsx("div", { className: "col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No decks yet. Create your first deck to start studying." }))] })] }), _jsx(CreateDeckModal, { isOpen: isCreateDeckOpen, onClose: () => setCreateDeckOpen(false), newDeckTitle: newDeckTitle, setNewDeckTitle: setNewDeckTitle, newDeckDescription: newDeckDescription, setNewDeckDescription: setNewDeckDescription, newDeckTags: newDeckTags, setNewDeckTags: setNewDeckTags, createDeckMutation: createDeckMutation })] }));
    }
    // Due view - Priority focused layout
    if (viewFilter === "due") {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-6 pb-10", children: [_jsx("div", { className: "rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 p-8 text-white shadow-xl shadow-rose-500/30", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm", children: [_jsx(FireIcon, { className: "size-4" }), "Needs attention"] }), _jsxs("h1", { className: "mt-4 text-3xl font-bold", children: [totalDue, " cards due"] }), _jsxs("p", { className: "mt-2 text-sm opacity-90", children: [filteredDecks.length, " deck", filteredDecks.length !== 1 ? "s" : "", " waiting for review"] })] }), filteredDecks.length > 0 && (_jsx("button", { type: "button", onClick: () => {
                                            const dueDeck = filteredDecks[0];
                                            apiClient
                                                .post("/study/sessions", { deck_id: dueDeck.id, mode: "review", config: { endless: false } })
                                                .then((response) => {
                                                window.location.href = `/app/study/${response.data.id}`;
                                            });
                                        }, className: "rounded-full bg-white px-5 py-2 text-sm font-semibold text-rose-600 shadow-lg transition hover:bg-rose-50", children: "Start Now" }))] }) }), filteredDecks.length > 0 ? (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: filteredDecks.map((deck) => (_jsx(DeckCard, { deck: deck }, deck.id))) })) : (_jsxs("div", { className: "rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700", children: [_jsx(FireIcon, { className: "mx-auto size-12 text-slate-300 dark:text-slate-600" }), _jsx("p", { className: "mt-4 font-medium text-slate-900 dark:text-white", children: "All caught up!" }), _jsx("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: "No cards due right now. Great work!" })] }))] }), _jsx(CreateDeckModal, { isOpen: isCreateDeckOpen, onClose: () => setCreateDeckOpen(false), newDeckTitle: newDeckTitle, setNewDeckTitle: setNewDeckTitle, newDeckDescription: newDeckDescription, setNewDeckDescription: setNewDeckDescription, newDeckTags: newDeckTags, setNewDeckTags: setNewDeckTags, createDeckMutation: createDeckMutation })] }));
    }
    // Pinned view - Favorites style layout
    if (viewFilter === "pinned") {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-6 pb-10", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex size-12 items-center justify-center rounded-xl bg-amber-500/10", children: _jsx(BookmarkIcon, { className: "size-6 text-amber-600 dark:text-amber-400" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: "Pinned Decks" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Your favorite decks for quick access" })] })] }), filteredDecks.length > 0 ? (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: filteredDecks.map((deck) => (_jsx(DeckCard, { deck: deck }, deck.id))) })) : (_jsxs("div", { className: "rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700", children: [_jsx(BookmarkIcon, { className: "mx-auto size-12 text-slate-300 dark:text-slate-600" }), _jsx("p", { className: "mt-4 font-medium text-slate-900 dark:text-white", children: "No pinned decks yet" }), _jsx("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: "Pin your favorite decks to access them quickly" })] }))] }), _jsx(CreateDeckModal, { isOpen: isCreateDeckOpen, onClose: () => setCreateDeckOpen(false), newDeckTitle: newDeckTitle, setNewDeckTitle: setNewDeckTitle, newDeckDescription: newDeckDescription, setNewDeckDescription: setNewDeckDescription, newDeckTags: newDeckTags, setNewDeckTags: setNewDeckTags, createDeckMutation: createDeckMutation })] }));
    }
    return null;
};
// Create Deck Modal Component (shared across all views)
const CreateDeckModal = ({ isOpen, onClose, newDeckTitle, setNewDeckTitle, newDeckDescription, setNewDeckDescription, newDeckTags, setNewDeckTags, createDeckMutation }) => {
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: "Create a new deck" }), _jsx("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: "Give your deck a name and optional tags. You can add cards after it is created." }), _jsxs("form", { className: "mt-6 space-y-4", onSubmit: (event) => {
                        event.preventDefault();
                        if (!newDeckTitle.trim()) {
                            return;
                        }
                        createDeckMutation.mutate();
                    }, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "deck-title", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Deck title" }), _jsx("input", { id: "deck-title", value: newDeckTitle, onChange: (event) => setNewDeckTitle(event.target.value), placeholder: "e.g. Organic Chemistry Basics", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100", required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "deck-description", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Description (optional)" }), _jsx("textarea", { id: "deck-description", value: newDeckDescription, onChange: (event) => setNewDeckDescription(event.target.value), rows: 3, placeholder: "Briefly describe what this deck covers", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "deck-tags", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Tags (comma separated)" }), _jsx("input", { id: "deck-tags", value: newDeckTags, onChange: (event) => setNewDeckTags(event.target.value), placeholder: "biology, exam prep", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" })] }), createDeckMutation.isError ? (_jsx("p", { className: "rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300", children: "Unable to create the deck right now. Please check your inputs and try again." })) : null, _jsxs("div", { className: "flex items-center justify-end gap-3 pt-2", children: [_jsx("button", { type: "button", onClick: () => {
                                        if (!createDeckMutation.isPending) {
                                            onClose();
                                        }
                                    }, className: "rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300", children: "Cancel" }), _jsx("button", { type: "submit", className: "rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70", disabled: createDeckMutation.isPending, children: createDeckMutation.isPending ? "Creating..." : "Create deck" })] })] })] }) }));
};
