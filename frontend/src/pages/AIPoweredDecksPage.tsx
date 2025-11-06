import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/apiClient";
import type {
  GeneratedCard,
  GeneratedCardsResponse,
  CreateDeckFromCardsRequest,
  DeckDetail,
  User,
  OllamaStatus,
} from "../types/api";

type Step = "upload" | "generating" | "review";

export default function AIPoweredDecksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [numCards, setNumCards] = useState(10);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [deckTags, setDeckTags] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Fetch current user to check AI configuration
  const { data: user } = useQuery<User>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data } = await apiClient.get<User>("/me");
      return data;
    },
  });

  // Check Ollama status
  const { data: ollamaStatus } = useQuery<OllamaStatus>({
    queryKey: ["ollamaStatus"],
    queryFn: async () => {
      const { data } = await apiClient.get<OllamaStatus>("/ai-decks/ollama/status");
      return data;
    },
  });

  // Generate cards mutation
  const generateMutation = useMutation({
    mutationFn: async ({ file, numCards }: { file: File; numCards: number }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("num_cards", numCards.toString());

      const { data } = await apiClient.post<GeneratedCardsResponse>(
        "/ai-decks/generate-from-file",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
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
    mutationFn: async (payload: CreateDeckFromCardsRequest) => {
      const { data } = await apiClient.post<DeckDetail>("/ai-decks/create-deck", payload);
      return data;
    },
    onSuccess: (deck) => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      navigate(`/app/decks/${deck.id}`);
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validExtensions = [".pdf", ".ppt", ".pptx", ".txt", ".docx"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      alert("Please upload a PDF, PPT, PPTX, TXT, or DOCX file");
      return;
    }

    setSelectedFile(file);
  };

  const handleGenerate = () => {
    if (!selectedFile) return;

    setStep("generating");
    generateMutation.mutate({ file: selectedFile, numCards });
  };

  const handleEditCard = (index: number, field: keyof GeneratedCard, value: any) => {
    const updated = [...generatedCards];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedCards(updated);
  };

  const handleEditOption = (cardIndex: number, optionIndex: number, value: string) => {
    const updated = [...generatedCards];
    const options = [...(updated[cardIndex].options || [])];
    options[optionIndex] = value;
    updated[cardIndex] = { ...updated[cardIndex], options };
    setGeneratedCards(updated);
  };

  const getCardTypeLabel = (type: GeneratedCard["type"]) => {
    const labels = {
      basic: "Basic Q&A",
      multiple_choice: "Multiple Choice",
      short_answer: "Short Answer",
      cloze: "Fill in the Blank"
    };
    return labels[type];
  };

  const getCardTypeColor = (type: GeneratedCard["type"]) => {
    const colors = {
      basic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      multiple_choice: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      short_answer: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      cloze: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    };
    return colors[type];
  };

  const handleDeleteCard = (index: number) => {
    setGeneratedCards(generatedCards.filter((_, i) => i !== index));
  };

  const validateCard = (card: GeneratedCard): string | null => {
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
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          AI Powered Decks
        </h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                AI Not Configured
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                To use AI-powered deck generation, you need to configure an AI provider:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-2 mb-4">
                <li>
                  <strong>Option 1:</strong> Add your OpenAI API key in Settings (fast, cloud-based)
                </li>
                <li>
                  <strong>Option 2:</strong> Install and run Ollama locally (free, private)
                </li>
              </ul>
              <button
                onClick={() => navigate("/app/settings")}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Powered Decks</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload a document and let AI generate flashcards for you
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {(["upload", "generating", "review"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : i < (["upload", "generating", "review"] as Step[]).indexOf(step)
                    ? "bg-green-600 text-white"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                }`}
              >
                {i < (["upload", "generating", "review"] as Step[]).indexOf(step) ? "✓" : i + 1}
              </div>
              <span
                className={`ml-2 mr-4 text-sm ${
                  step === s ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"
                }`}
              >
                {s === "upload" ? "Upload" : s === "generating" ? "Generating" : "Review"}
              </span>
              {i < 2 && <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 mr-4"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Upload Document
          </h2>

          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx,.txt,.docx"
              onChange={handleFileInput}
              className="hidden"
            />

            {!selectedFile ? (
              <>
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop your file here, or{" "}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    browse
                  </button>
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Supported: PDF, PPT, PPTX, TXT, DOCX (max 10MB)
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center text-green-600 dark:text-green-400">
                  <svg className="w-8 h-8 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  Remove file
                </button>
              </div>
            )}
          </div>

          {/* Number of Cards Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of flashcards to generate: {numCards}
            </label>
            <input
              type="range"
              min="5"
              max="20"
              value={numCards}
              onChange={(e) => setNumCards(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!selectedFile}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Flashcards
            </button>
          </div>
        </div>
      )}

      {/* Generating Step */}
      {step === "generating" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <h2 className="text-xl font-semibold mt-6 text-gray-900 dark:text-white">
            Generating Flashcards...
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Our AI is analyzing your document and creating flashcards. This may take a minute.
          </p>
          {generateMutation.isError && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
              <p className="font-medium">Generation failed</p>
              <p className="text-sm">
                {(generateMutation.error as any)?.response?.data?.detail ||
                  "An error occurred. Please try again."}
              </p>
              <button
                onClick={() => setStep("upload")}
                className="mt-2 text-sm underline"
              >
                Go back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Step */}
      {step === "review" && (
        <div className="space-y-6">
          {/* Deck Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Deck Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  placeholder="My AI Generated Deck"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={deckTags}
                  onChange={(e) => setDeckTags(e.target.value)}
                  placeholder="ai-generated, study, ..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Generated Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Generated Flashcards ({generatedCards.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Review and edit the cards before creating your deck
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["basic", "multiple_choice", "short_answer", "cloze"].map((type) => {
                  const count = generatedCards.filter((c) => c.type === type).length;
                  if (count === 0) return null;
                  return (
                    <span
                      key={type}
                      className={`text-xs px-2 py-1 rounded-full ${getCardTypeColor(type as GeneratedCard["type"])}`}
                    >
                      {getCardTypeLabel(type as GeneratedCard["type"])}: {count}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {generatedCards.map((card, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Card {index + 1}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getCardTypeColor(card.type)}`}>
                        {getCardTypeLabel(card.type)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setEditingIndex(editingIndex === index ? null : index)
                        }
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {editingIndex === index ? "Done" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleDeleteCard(index)}
                        className="text-sm text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Question
                        </label>
                        <textarea
                          value={card.prompt}
                          onChange={(e) =>
                            handleEditCard(index, "prompt", e.target.value)
                          }
                          rows={card.type === "cloze" ? 3 : 2}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {card.type === "cloze" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Use {`{{c1::text}}, {{c2::text}}`} format for blanks
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Answer
                        </label>
                        <textarea
                          value={card.answer}
                          onChange={(e) =>
                            handleEditCard(index, "answer", e.target.value)
                          }
                          rows={2}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      {/* Multiple Choice Options */}
                      {card.type === "multiple_choice" && card.options && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Options
                          </label>
                          <div className="space-y-2">
                            {card.options.map((option, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) =>
                                    handleEditOption(index, optIdx, e.target.value)
                                  }
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                {option === card.answer && (
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {card.explanation && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Explanation
                          </label>
                          <textarea
                            value={card.explanation}
                            onChange={(e) =>
                              handleEditCard(index, "explanation", e.target.value)
                            }
                            rows={2}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Q: {card.prompt}
                        </p>

                        {/* Multiple Choice Options Display */}
                        {card.type === "multiple_choice" && card.options && (
                          <div className="mt-2 space-y-1 mb-2">
                            {card.options.map((option, optIdx) => (
                              <div
                                key={optIdx}
                                className={`text-sm px-3 py-1.5 rounded ${
                                  option === card.answer
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium"
                                    : "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <span className="font-medium mr-2">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                {option}
                                {option === card.answer && (
                                  <span className="ml-2 text-xs">✓</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Answer for non-multiple choice */}
                        {card.type !== "multiple_choice" && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            A: {card.answer}
                          </p>
                        )}
                      </div>
                      {card.explanation && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 italic border-t border-gray-200 dark:border-gray-700 pt-2">
                          <span className="font-medium">Explanation:</span> {card.explanation}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => {
                setStep("upload");
                setSelectedFile(null);
                setGeneratedCards([]);
                setDeckTitle("");
                setDeckDescription("");
                setDeckTags("");
              }}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Start Over
            </button>
            <button
              onClick={handleCreateDeck}
              disabled={createDeckMutation.isPending || !deckTitle.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createDeckMutation.isPending ? "Creating..." : "Create Deck"}
            </button>
          </div>

          {createDeckMutation.isError && (
            <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
              <p className="font-medium">Failed to create deck</p>
              <p className="text-sm">
                {(createDeckMutation.error as any)?.response?.data?.detail ||
                  "An error occurred. Please try again."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
