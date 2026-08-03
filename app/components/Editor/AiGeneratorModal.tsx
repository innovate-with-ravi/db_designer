"use client";

import { useState, useEffect } from "react";
import useDiagramStore from "@/store/useDiagramStore";
import { generateLayout } from "@/lib/layout";
import { useParams } from "next/navigation";



/*A modal to give scenario*/
export default function AiGeneratorModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { setDiagram, setAiGeneratedSql, lastScenario } = useDiagramStore();
    const [scenario, setScenario] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // api keys
    const [apiKeys, setApiKeys] = useState({ openai: '', gemini: '', groq: '' });
    const [showApiKeys, setShowApiKeys] = useState(false);

    // Load keys from local storage on mount
    useEffect(() => {
        const savedKeys = localStorage.getItem('userApiKeys');
        if (savedKeys) {
            try {
                setApiKeys(JSON.parse(savedKeys));
            } catch (e) {
                console.error("Failed to parse saved API keys");
            }
        }
    }, []);

    const handleKeyChange = (provider: 'openai' | 'gemini' | 'groq', value: string) => {
        const newKeys = { ...apiKeys, [provider]: value };

        setApiKeys(newKeys);
        localStorage.setItem('userApiKeys', JSON.stringify(newKeys));
    };

    // Sync from Zustand on load
    useEffect(() => {
        if (lastScenario && !scenario) {
            setScenario(lastScenario);
        }
    }, [lastScenario, isOpen]);

    // get the diagramId
    const params = useParams();
    const diagramId = params.id as string;

    console.log(`[AiGeneratorModal] diagramId: ${diagramId}`);

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
                body: JSON.stringify({ scenario, diagramId, apiKeys })
            });

            console.log("[AiGeneratorModal] response:", JSON.stringify(response, null, 2));
            const data = await response.json();// data = response body

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate diagram');
            }

            // data.jsonSchema and data.generatedSql
            const { nodes, edges, relationshipAttributes } = await generateLayout(data.jsonSchema);

            // Push layout to Zustand
            setDiagram(nodes, edges, relationshipAttributes, scenario, data.generatedSql);

            // Save highly refined SQL from semantic refiner for the AI Export button
            // setAiGeneratedSql is redundant now since setDiagram handles it, but left for safety
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
            <div className="bg-background border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
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
                        className="w-full h-50 max-h-100 bg-surface border border-border rounded-xl p-4 text-foreground focus:ring-2 focus:ring-brand-indigo focus:outline-none resize-both"
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

                    {/* Set apiKeys */}
                    <div className="mt-2 border border-border rounded-xl overflow-hidden bg-surface/30">
                        <button
                            onClick={() => setShowApiKeys(!showApiKeys)}
                            className="w-full flex items-center justify-between p-4 text-sm font-medium text-foreground hover:bg-surface transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                🔑 Advanced: Use Your Own API Keys
                            </span>
                            <span className="text-muted-foreground text-xs">
                                {showApiKeys ? 'Hide' : 'Show'}
                            </span>
                        </button>
                        
                        {showApiKeys && (
                            <div className="p-4 border-t border-border flex flex-col gap-3 bg-surface/10 animate-in slide-in-from-top-2">
                                <p className="text-xs text-muted-foreground mb-1">
                                    By default, this tool uses the platform's API keys which may run out of quota. Add your own keys to bypass limits. Keys are saved securely in your browser.
                                </p>
                                
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-foreground">Google Gemini API Key (Recommended)</label>
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-brand-indigo hover:underline">Get Key</a>
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-indigo focus:outline-none"
                                        placeholder="AIzaSy..."
                                        value={apiKeys.gemini}
                                        onChange={(e) => handleKeyChange('gemini', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-foreground">Groq API Key (Fastest)</label>
                                        <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-[10px] text-brand-indigo hover:underline">Get Key</a>
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-indigo focus:outline-none"
                                        placeholder="gsk_..."
                                        value={apiKeys.groq}
                                        onChange={(e) => handleKeyChange('groq', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-foreground">OpenAI API Key</label>
                                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[10px] text-brand-indigo hover:underline">Get Key</a>
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-indigo focus:outline-none"
                                        placeholder="sk-..."
                                        value={apiKeys.openai}
                                        onChange={(e) => handleKeyChange('openai', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
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
