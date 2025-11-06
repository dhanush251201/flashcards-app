import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [apiKey, setApiKey] = useState("");
    const [provider, setProvider] = useState("openai");
    const [showApiKey, setShowApiKey] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    // Fetch current user data
    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: async () => {
            const { data } = await apiClient.get("/me");
            return data;
        },
    });
    // Check Ollama availability
    const { data: ollamaStatus } = useQuery({
        queryKey: ["ollamaStatus"],
        queryFn: async () => {
            const { data } = await apiClient.get("/ai-decks/ollama/status");
            return data;
        },
        refetchInterval: 30000, // Check every 30 seconds
    });
    // Update settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: async (settings) => {
            const { data } = await apiClient.put("/me/settings", settings);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
            setSuccessMessage("Settings updated successfully!");
            setApiKey(""); // Clear the input
            setErrorMessage("");
            setTimeout(() => setSuccessMessage(""), 3000);
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.detail || "Failed to update settings";
            setErrorMessage(errorMsg);
            setSuccessMessage("");
        },
    });
    const handleSaveSettings = () => {
        const settings = {
            llm_provider_preference: provider,
        };
        // Only include API key if it's been entered
        if (apiKey.trim()) {
            settings.openai_api_key = apiKey.trim();
        }
        updateSettingsMutation.mutate(settings);
    };
    const handleRemoveApiKey = () => {
        updateSettingsMutation.mutate({
            openai_api_key: "",
        });
    };
    if (userLoading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" }) }));
    }
    return (_jsxs("div", { className: "max-w-4xl mx-auto p-6", children: [_jsx("h1", { className: "text-3xl font-bold mb-6 text-gray-900 dark:text-white", children: "Settings" }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-900 dark:text-white", children: "AI Configuration" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-6", children: "Configure your AI provider for generating flashcards from documents." }), successMessage && (_jsx("div", { className: "mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md", children: successMessage })), errorMessage && (_jsx("div", { className: "mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md", children: errorMessage })), _jsxs("div", { className: "mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsx("h3", { className: "font-medium text-gray-900 dark:text-white mb-2", children: "Current Status" }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400", children: "OpenAI API Key:" }), _jsx("span", { className: `font-medium ${user?.has_openai_key ? 'text-green-600' : 'text-gray-400'}`, children: user?.has_openai_key ? "Configured ✓" : "Not Set" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400", children: "Ollama:" }), _jsx("span", { className: `font-medium ${ollamaStatus?.available ? 'text-green-600' : 'text-gray-400'}`, children: ollamaStatus?.available ? "Available ✓" : "Not Available" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-gray-600 dark:text-gray-400", children: "Preferred Provider:" }), _jsx("span", { className: "font-medium text-gray-900 dark:text-white", children: user?.llm_provider_preference || "Auto" })] })] })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Preferred AI Provider" }), _jsxs("select", { value: provider, onChange: (e) => setProvider(e.target.value), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white", children: [_jsx("option", { value: "openai", children: "OpenAI (requires API key)" }), _jsx("option", { value: "ollama", children: "Ollama (local, free)" })] }), _jsx("p", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: provider === "openai"
                                    ? "Fast and high-quality, but requires an API key"
                                    : "Free and runs locally, but requires Ollama to be installed" })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "OpenAI API Key" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx("input", { type: showApiKey ? "text" : "password", value: apiKey, onChange: (e) => setApiKey(e.target.value), placeholder: "sk-...", className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" }), _jsx("button", { type: "button", onClick: () => setShowApiKey(!showApiKey), className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200", children: showApiKey ? (_jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" }) })) : (_jsxs("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" })] })) })] }), user?.has_openai_key && (_jsx("button", { onClick: handleRemoveApiKey, className: "px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800", children: "Remove" }))] }), _jsxs("p", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: ["Get your API key from", " ", _jsx("a", { href: "https://platform.openai.com/api-keys", target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:underline dark:text-blue-400", children: "OpenAI Platform" })] })] }), !ollamaStatus?.available && provider === "ollama" && (_jsxs("div", { className: "mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg", children: [_jsx("h4", { className: "font-medium text-yellow-800 dark:text-yellow-200 mb-2", children: "Ollama Not Detected" }), _jsx("p", { className: "text-sm text-yellow-700 dark:text-yellow-300 mb-2", children: "To use Ollama, you need to install it first:" }), _jsxs("ol", { className: "list-decimal list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1", children: [_jsxs("li", { children: ["Download from", " ", _jsx("a", { href: "https://ollama.ai", target: "_blank", rel: "noopener noreferrer", className: "font-medium underline", children: "ollama.ai" })] }), _jsx("li", { children: "Install and start Ollama" }), _jsxs("li", { children: ["Run: ", _jsx("code", { className: "px-1 py-0.5 bg-yellow-100 dark:bg-yellow-800 rounded", children: "ollama pull llama3.1" })] }), _jsx("li", { children: "Refresh this page" })] })] })), _jsx("div", { className: "flex justify-end", children: _jsx("button", { onClick: handleSaveSettings, disabled: updateSettingsMutation.isPending, className: "px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed", children: updateSettingsMutation.isPending ? "Saving..." : "Save Settings" }) })] }), _jsx("div", { className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "h-5 w-5 text-blue-400", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z", clipRule: "evenodd" }) }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-blue-800 dark:text-blue-200", children: "Security & Privacy" }), _jsx("div", { className: "mt-2 text-sm text-blue-700 dark:text-blue-300", children: _jsxs("ul", { className: "list-disc list-inside space-y-1", children: [_jsx("li", { children: "Your API key is stored securely and never exposed in responses" }), _jsx("li", { children: "Using Ollama keeps all data processing local on your machine" }), _jsx("li", { children: "OpenAI may process your content according to their privacy policy" })] }) })] })] }) })] }));
}
