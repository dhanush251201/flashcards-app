import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/apiClient";
export default function AIPoweredDecksPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [step, setStep] = useState("upload");
    const [selectedFile, setSelectedFile] = useState(null);
    const [numCards, setNumCards] = useState(10);
    const [generatedCards, setGeneratedCards] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [deckTitle, setDeckTitle] = useState("");
    const [deckDescription, setDeckDescription] = useState("");
    const [deckTags, setDeckTags] = useState("");
    const [dragActive, setDragActive] = useState(false);
    // Fetch current user to check AI configuration
    const { data: user } = useQuery({
        queryKey: ["currentUser"],
        queryFn: async () => {
            const { data } = await apiClient.get("/me");
            return data;
        },
    });
    // Check Ollama status
    const { data: ollamaStatus } = useQuery({
        queryKey: ["ollamaStatus"],
        queryFn: async () => {
            const { data } = await apiClient.get("/ai-decks/ollama/status");
            return data;
        },
    });
    // Generate cards mutation
    const generateMutation = useMutation({
        mutationFn: async ({ file, numCards }) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("num_cards", numCards.toString());
            const { data } = await apiClient.post("/ai-decks/generate-from-file", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return data;
        },
        onSuccess: (data) => {
            setGeneratedCards(data.cards);
            setStep("review");
            // Auto-generate deck title from filename
            if (selectedFile) {
                const title = selectedFile.name.replace(/\.[^/.]+$/, "");
                setDeckTitle(`AI Generated: ${title}`);
            }
        },
    });
    // Create deck mutation
    const createDeckMutation = useMutation({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post("/ai-decks/create-deck", payload);
            return data;
        },
        onSuccess: (deck) => {
            queryClient.invalidateQueries({ queryKey: ["decks"] });
            navigate(`/app/decks/${deck.id}`);
        },
    });
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        }
        else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };
    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };
    const handleFileSelect = (file) => {
        const validExtensions = [".pdf", ".ppt", ".pptx", ".txt", ".docx"];
        const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
        if (!validExtensions.includes(fileExt)) {
            alert("Please upload a PDF, PPT, PPTX, TXT, or DOCX file");
            return;
        }
        setSelectedFile(file);
    };
    const handleGenerate = () => {
        if (!selectedFile)
            return;
        setStep("generating");
        generateMutation.mutate({ file: selectedFile, numCards });
    };
    const handleEditCard = (index, field, value) => {
        const updated = [...generatedCards];
        updated[index] = { ...updated[index], [field]: value };
        setGeneratedCards(updated);
    };
    const handleEditOption = (cardIndex, optionIndex, value) => {
        const updated = [...generatedCards];
        const options = [...(updated[cardIndex].options || [])];
        options[optionIndex] = value;
        updated[cardIndex] = { ...updated[cardIndex], options };
        setGeneratedCards(updated);
    };
    const getCardTypeLabel = (type) => {
        const labels = {
            basic: "Basic Q&A",
            multiple_choice: "Multiple Choice",
            short_answer: "Short Answer",
            cloze: "Fill in the Blank"
        };
        return labels[type];
    };
    const getCardTypeColor = (type) => {
        const colors = {
            basic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            multiple_choice: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            short_answer: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
            cloze: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        };
        return colors[type];
    };
    const handleDeleteCard = (index) => {
        setGeneratedCards(generatedCards.filter((_, i) => i !== index));
    };
    const validateCard = (card) => {
        if (!card.prompt || !card.prompt.trim()) {
            return "Card prompt is required";
        }
        if (!card.answer || !card.answer.trim()) {
            return "Card answer is required";
        }
        if (card.type === "multiple_choice") {
            if (!card.options || card.options.length < 2) {
                return "Multiple choice cards must have at least 2 options";
            }
            if (!card.options.includes(card.answer)) {
                return "Multiple choice answer must be one of the options";
            }
            if (new Set(card.options).size !== card.options.length) {
                return "Multiple choice options must be unique";
            }
        }
        if (card.type === "cloze") {
            if (!card.prompt.includes("{{c")) {
                return "Cloze cards must contain at least one blank ({{c1::text}})";
            }
            if (!card.cloze_data || !card.cloze_data.blanks || card.cloze_data.blanks.length === 0) {
                return "Cloze cards must have cloze_data with blanks";
            }
        }
        return null;
    };
    const handleCreateDeck = () => {
        if (!deckTitle.trim()) {
            alert("Please enter a deck title");
            return;
        }
        if (generatedCards.length === 0) {
            alert("No cards to create deck with");
            return;
        }
        // Validate all cards
        for (let i = 0; i < generatedCards.length; i++) {
            const error = validateCard(generatedCards[i]);
            if (error) {
                alert(`Card ${i + 1}: ${error}`);
                return;
            }
        }
        const tagNames = deckTags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        createDeckMutation.mutate({
            title: deckTitle.trim(),
            description: deckDescription.trim(),
            tag_names: tagNames,
            cards: generatedCards,
        });
    };
    const hasAIConfigured = user?.has_openai_key || ollamaStatus?.available;
    // Show configuration warning if AI is not set up
    if (!hasAIConfigured) {
        return (_jsxs("div", { className: "max-w-4xl mx-auto p-6", children: [_jsx("h1", { className: "text-3xl font-bold mb-6 text-gray-900 dark:text-white", children: "AI Powered Decks" }), _jsx("div", { className: "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "h-6 w-6 text-yellow-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2", children: "AI Not Configured" }), _jsx("p", { className: "text-sm text-yellow-700 dark:text-yellow-300 mb-4", children: "To use AI-powered deck generation, you need to configure an AI provider:" }), _jsxs("ul", { className: "list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-2 mb-4", children: [_jsxs("li", { children: [_jsx("strong", { children: "Option 1:" }), " Add your OpenAI API key in Settings (fast, cloud-based)"] }), _jsxs("li", { children: [_jsx("strong", { children: "Option 2:" }), " Install and run Ollama locally (free, private)"] })] }), _jsx("button", { onClick: () => navigate("/app/settings"), className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500", children: "Go to Settings" })] })] }) })] }));
    }
    return (_jsxs("div", { className: "max-w-6xl mx-auto p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "AI Powered Decks" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-2", children: "Upload a document and let AI generate flashcards for you" })] }), _jsx("div", { className: "mb-8", children: _jsx("div", { className: "flex items-center justify-center", children: ["upload", "generating", "review"].map((s, i) => (_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: `flex items-center justify-center w-10 h-10 rounded-full ${step === s
                                    ? "bg-blue-600 text-white"
                                    : i < ["upload", "generating", "review"].indexOf(step)
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"}`, children: i < ["upload", "generating", "review"].indexOf(step) ? "✓" : i + 1 }), _jsx("span", { className: `ml-2 mr-4 text-sm ${step === s ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"}`, children: s === "upload" ? "Upload" : s === "generating" ? "Generating" : "Review" }), i < 2 && _jsx("div", { className: "w-12 h-1 bg-gray-300 dark:bg-gray-600 mr-4" })] }, s))) }) }), step === "upload" && (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-900 dark:text-white", children: "Upload Document" }), _jsxs("div", { onDragEnter: handleDrag, onDragLeave: handleDrag, onDragOver: handleDrag, onDrop: handleDrop, className: `border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-300 dark:border-gray-600"}`, children: [_jsx("input", { ref: fileInputRef, type: "file", accept: ".pdf,.ppt,.pptx,.txt,.docx", onChange: handleFileInput, className: "hidden" }), !selectedFile ? (_jsxs(_Fragment, { children: [_jsx("svg", { className: "mx-auto h-12 w-12 text-gray-400", stroke: "currentColor", fill: "none", viewBox: "0 0 48 48", children: _jsx("path", { d: "M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }), _jsxs("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: ["Drag and drop your file here, or", " ", _jsx("button", { onClick: () => fileInputRef.current?.click(), className: "text-blue-600 hover:underline dark:text-blue-400", children: "browse" })] }), _jsx("p", { className: "mt-1 text-xs text-gray-500 dark:text-gray-500", children: "Supported: PDF, PPT, PPTX, TXT, DOCX (max 10MB)" })] })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-center text-green-600 dark:text-green-400", children: [_jsx("svg", { className: "w-8 h-8 mr-2", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }), _jsx("span", { className: "font-medium", children: selectedFile.name })] }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: [(selectedFile.size / 1024).toFixed(2), " KB"] }), _jsx("button", { onClick: () => setSelectedFile(null), className: "text-sm text-red-600 hover:underline dark:text-red-400", children: "Remove file" })] }))] }), _jsxs("div", { className: "mt-6", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: ["Number of flashcards to generate: ", numCards] }), _jsx("input", { type: "range", min: "5", max: "20", value: numCards, onChange: (e) => setNumCards(parseInt(e.target.value)), className: "w-full" }), _jsxs("div", { className: "flex justify-between text-xs text-gray-500 dark:text-gray-400", children: [_jsx("span", { children: "5" }), _jsx("span", { children: "20" })] })] }), _jsx("div", { className: "mt-6 flex justify-end", children: _jsx("button", { onClick: handleGenerate, disabled: !selectedFile, className: "px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed", children: "Generate Flashcards" }) })] })), step === "generating" && (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto" }), _jsx("h2", { className: "text-xl font-semibold mt-6 text-gray-900 dark:text-white", children: "Generating Flashcards..." }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-2", children: "Our AI is analyzing your document and creating flashcards. This may take a minute." }), generateMutation.isError && (_jsxs("div", { className: "mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md", children: [_jsx("p", { className: "font-medium", children: "Generation failed" }), _jsx("p", { className: "text-sm", children: generateMutation.error?.response?.data?.detail ||
                                    "An error occurred. Please try again." }), _jsx("button", { onClick: () => setStep("upload"), className: "mt-2 text-sm underline", children: "Go back" })] }))] })), step === "review" && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-900 dark:text-white", children: "Deck Information" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Title *" }), _jsx("input", { type: "text", value: deckTitle, onChange: (e) => setDeckTitle(e.target.value), placeholder: "My AI Generated Deck", className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Description" }), _jsx("textarea", { value: deckDescription, onChange: (e) => setDeckDescription(e.target.value), placeholder: "Optional description...", rows: 2, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Tags (comma-separated)" }), _jsx("input", { type: "text", value: deckTags, onChange: (e) => setDeckTags(e.target.value), placeholder: "ai-generated, study, ...", className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" })] })] })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: ["Generated Flashcards (", generatedCards.length, ")"] }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Review and edit the cards before creating your deck" })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: ["basic", "multiple_choice", "short_answer", "cloze"].map((type) => {
                                            const count = generatedCards.filter((c) => c.type === type).length;
                                            if (count === 0)
                                                return null;
                                            return (_jsxs("span", { className: `text-xs px-2 py-1 rounded-full ${getCardTypeColor(type)}`, children: [getCardTypeLabel(type), ": ", count] }, type));
                                        }) })] }), _jsx("div", { className: "space-y-4", children: generatedCards.map((card, index) => (_jsxs("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-sm font-medium text-gray-500 dark:text-gray-400", children: ["Card ", index + 1] }), _jsx("span", { className: `text-xs px-2 py-1 rounded-full ${getCardTypeColor(card.type)}`, children: getCardTypeLabel(card.type) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setEditingIndex(editingIndex === index ? null : index), className: "text-sm text-blue-600 hover:underline dark:text-blue-400", children: editingIndex === index ? "Done" : "Edit" }), _jsx("button", { onClick: () => handleDeleteCard(index), className: "text-sm text-red-600 hover:underline dark:text-red-400", children: "Delete" })] })] }), editingIndex === index ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Question" }), _jsx("textarea", { value: card.prompt, onChange: (e) => handleEditCard(index, "prompt", e.target.value), rows: card.type === "cloze" ? 3 : 2, className: "w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" }), card.type === "cloze" && (_jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: ["Use ", `{{c1::text}}, {{c2::text}}`, " format for blanks"] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Answer" }), _jsx("textarea", { value: card.answer, onChange: (e) => handleEditCard(index, "answer", e.target.value), rows: 2, className: "w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" })] }), card.type === "multiple_choice" && card.options && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Options" }), _jsx("div", { className: "space-y-2", children: card.options.map((option, optIdx) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-xs font-medium text-gray-500 dark:text-gray-400 w-6", children: [String.fromCharCode(65 + optIdx), "."] }), _jsx("input", { type: "text", value: option, onChange: (e) => handleEditOption(index, optIdx, e.target.value), className: "flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" }), option === card.answer && (_jsx("span", { className: "text-xs text-green-600 dark:text-green-400 font-medium", children: "\u2713 Correct" }))] }, optIdx))) })] })), card.explanation && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Explanation" }), _jsx("textarea", { value: card.explanation, onChange: (e) => handleEditCard(index, "explanation", e.target.value), rows: 2, className: "w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" })] }))] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-2", children: [_jsxs("p", { className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: ["Q: ", card.prompt] }), card.type === "multiple_choice" && card.options && (_jsx("div", { className: "mt-2 space-y-1 mb-2", children: card.options.map((option, optIdx) => (_jsxs("div", { className: `text-sm px-3 py-1.5 rounded ${option === card.answer
                                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium"
                                                                    : "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300"}`, children: [_jsxs("span", { className: "font-medium mr-2", children: [String.fromCharCode(65 + optIdx), "."] }), option, option === card.answer && (_jsx("span", { className: "ml-2 text-xs", children: "\u2713" }))] }, optIdx))) })), card.type !== "multiple_choice" && (_jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: ["A: ", card.answer] }))] }), card.explanation && (_jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-500 italic border-t border-gray-200 dark:border-gray-700 pt-2", children: [_jsx("span", { className: "font-medium", children: "Explanation:" }), " ", card.explanation] }))] }))] }, index))) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("button", { onClick: () => {
                                    setStep("upload");
                                    setSelectedFile(null);
                                    setGeneratedCards([]);
                                    setDeckTitle("");
                                    setDeckDescription("");
                                    setDeckTags("");
                                }, className: "px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500", children: "Start Over" }), _jsx("button", { onClick: handleCreateDeck, disabled: createDeckMutation.isPending || !deckTitle.trim(), className: "px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed", children: createDeckMutation.isPending ? "Creating..." : "Create Deck" })] }), createDeckMutation.isError && (_jsxs("div", { className: "p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md", children: [_jsx("p", { className: "font-medium", children: "Failed to create deck" }), _jsx("p", { className: "text-sm", children: createDeckMutation.error?.response?.data?.detail ||
                                    "An error occurred. Please try again." })] }))] }))] }));
}
