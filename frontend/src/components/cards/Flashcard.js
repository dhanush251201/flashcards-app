import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
export const Flashcard = ({ card, flipped, onToggle }) => {
    const [internalFlipped, setInternalFlipped] = useState(false);
    const isControlled = typeof flipped === "boolean";
    const isFlipped = isControlled ? flipped : internalFlipped;
    return (_jsx("button", { type: "button", onClick: () => {
            if (isControlled) {
                onToggle?.();
            }
            else {
                setInternalFlipped((prev) => !prev);
            }
        }, className: "group relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 p-[2px] text-left transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:from-slate-900 dark:to-slate-950", children: _jsxs("div", { className: "glass-panel flex h-full w-full flex-col justify-between rounded-[26px] p-6 text-slate-700 transition-colors duration-300 dark:text-slate-200", children: [!isFlipped ? (_jsxs("div", { className: "space-y-4", children: [_jsx("span", { className: "inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300", children: "Prompt" }), _jsx("p", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: card.type === "cloze"
                                ? card.prompt.split(/(\[BLANK\])/gi).map((part, i) => part.match(/\[BLANK\]/i)
                                    ? _jsx("span", { className: "inline-block mx-1 px-4 py-0.5 bg-brand-100 border-b-2 border-brand-400 dark:bg-brand-900/30 dark:border-brand-500", children: "____" }, i)
                                    : _jsx("span", { children: part }, i))
                                : card.prompt })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsx("span", { className: "inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300", children: "Answer" }), _jsx("p", { className: "text-lg font-medium text-slate-900 dark:text-white", children: card.answer }), card.explanation && _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-300", children: card.explanation })] })), _jsxs("div", { className: "flex items-center justify-between text-xs text-slate-400", children: [_jsxs("span", { className: "inline-flex items-center gap-1 text-slate-500 dark:text-slate-300", children: [_jsx(SparklesIcon, { className: "size-4" }), " Tap to flip"] }), _jsx("span", { className: "text-[11px] uppercase tracking-wide", children: card.type })] })] }) }));
};
