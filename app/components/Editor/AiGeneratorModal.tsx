"use client";

import { useState } from "react";
import useDiagramStore from "@/store/useDiagramStore";
import { generateLayout } from "@/lib/layout";

/*A modal to give scenario*/
export default function AiGeneratorModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { setDiagram, setAiGeneratedSql } = useDiagramStore();
    const [scenario, setScenario] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!scenario.trim()) {
            setError("Please describe your database scenario.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/generate-er', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario })
            });

            const data = await response.json();// data = response body

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate diagram');
            }

            // data.jsonSchema and data.generatedSql
            const { nodes, edges } = generateLayout(data.jsonSchema);

            // Push layout to Zustand
            setDiagram(nodes, edges);

            // Save highly refined SQL from semantic refiner for the AI Export button
            setAiGeneratedSql(data.generatedSql);

            onClose();
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-background border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-indigo/20 flex items-center justify-center text-brand-indigo">
                            ✨
                        </div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight">AI Schema Generator</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all transform hover:scale-105 active:scale-95"
                        title="Close Modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4">
                    <p className="text-muted-foreground text-sm">
                        Describe the application or database you want to build. Our AI Architect will design the entities, relationships, and layout them automatically.
                    </p>
                    <textarea
                        className="w-full h-32 bg-surface border border-border rounded-xl p-4 text-foreground focus:ring-2 focus:ring-brand-indigo focus:outline-none resize-none"
                        placeholder="e.g. An e-commerce platform with users, products, categories, orders, and order items. A user can have multiple orders..."
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                        disabled={isGenerating}
                    />

                    {error && (
                        <div className="text-red-500 text-sm font-medium p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border bg-surface/50 flex justify-end">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-6 py-2.5 bg-brand-indigo hover:opacity-90 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <span className="animate-spin text-xl">⏳</span>
                                Generating... (Takes 10-30s)
                            </>
                        ) : (
                            <>
                                ✨ Generate Diagram
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
