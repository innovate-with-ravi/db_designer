"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import useDiagramStore from "@/store/useDiagramStore";
import { compileDiagramState } from "@/lib/compiler";
import { generateSQL } from "@/lib/sqlGenerator";
import { generatePrisma } from "@/lib/prismaGenerator";
import { generateSqlHtml } from "@/action/generateSqlHtml";
import SqlCodeBlock from "./SqlCodeBlock";
import { Edge } from "@langchain/core/runnables/graph";

export default function ExportModal({ isOpen, onClose, mode = 'canvas' }: { isOpen: boolean, onClose: () => void, mode?: 'canvas' | 'ai' }) {
    const { theme, resolvedTheme } = useTheme();
    const { nodes, edges, exportDialect, setExportDialect, aiGeneratedSql, relationshipAttributes } = useDiagramStore();
    const [copied, setCopied] = useState(false);

    // Local state to manage the outputs dynamically
    const [htmlCode, setHtmlCode] = useState<string>("");
    const [rawCode, setRawCode] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const generate = async () => {
            setIsGenerating(true);
            
            try {
                let finalCode = "";

                if (mode === 'ai') {
                    finalCode = aiGeneratedSql || "-- No AI generated SQL found. Did you generate an AI ER diagram first?";
                } else {
                    const compiledEntities = compileDiagramState(nodes, edges);
                    if (exportDialect === 'prisma') {
                        finalCode = generatePrisma(compiledEntities, edges, relationshipAttributes);
                    } else {
                        finalCode = generateSQL(compiledEntities, (edges as Edge[]), exportDialect, relationshipAttributes);
                    }
                }

                setRawCode(finalCode);
                const html = await generateSqlHtml(finalCode, (resolvedTheme ?? theme) as any); // Fetch the color coding!
                setHtmlCode(html);
            } catch (error) {
                setRawCode("-- Error compiling diagram.");
                setHtmlCode("<div><span style='color: #ef4444;'>-- Error compiling diagram. Ensure all tables have Primary Keys.</span></div>");
            } finally {
                setIsGenerating(false);
            }
        };

        generate();
    }, [nodes, edges, exportDialect, isOpen, resolvedTheme, theme, relationshipAttributes, aiGeneratedSql, mode]);

    const handleCopy = () => {
        navigator.clipboard.writeText(rawCode); // Copy the raw string, not HTML tags!
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
            {/* 🌟 UI Upgrade: Much wider modal (max-w-5xl) */}
            <div className="bg-background border border-border w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">

                {/* Header & Controls */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue">
                            {mode === 'ai' ? '✨' : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight">{mode === 'ai' ? 'AI Refined SQL' : 'Export Code'}</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Dialect Selector */}
                        {mode === 'canvas' && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-muted-foreground hidden sm:block">Format:</label>
                                <select
                                    value={exportDialect}
                                    onChange={(e) => setExportDialect(e.target.value as any)}
                                    className="bg-surface border border-border text-foreground font-medium text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue cursor-pointer hover:bg-surface-hover transition-colors"
                                >
                                    <option className="bg-background text-foreground" value="mysql">MySQL</option>
                                    <option className="bg-background text-foreground" value="oracle">Oracle SQL</option>
                                    <option className="bg-background text-foreground" value="prisma">Prisma Schema</option>
                                </select>
                            </div>
                        )}

                        <div className="h-6 w-px bg-border hidden sm:block" />

                        {/* 🌟 Prominent Close Button */}
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all transform hover:scale-105 active:scale-95"
                            title="Close Modal"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Code Window */}
                <div className="p-6 bg-background overflow-y-auto h-[600px] max-h-[70vh] relative group">
                    {isGenerating ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-brand-blue font-mono text-lg animate-pulse flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                                Compiling Engine...
                            </div>
                        </div>
                    ) : (
                        /* 🌟 THE FIX: Added [&_pre]:overflow-x-auto, max-w-full, and padding to force Shiki to scroll properly */
                        <div className="text-sm sm:text-base font-mono w-full max-w-full overflow-x-hidden [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:pb-6 [&_pre]:pt-2 [&_code]:block [&_code]:min-w-fit">
                            <SqlCodeBlock html={htmlCode} />
                        </div>
                    )}

                    <button
                        onClick={handleCopy}
                        disabled={isGenerating}
                        className={`sticky bottom-6 left-200 px-6 py-3 rounded-lg font-bold text-white shadow-xl transition-all transform hover:scale-105 active:scale-95 ${copied ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-brand-blue hover:bg-blue-600 shadow-brand-blue/20'}`}
                    >
                        {copied ? 'Copied! ✓' : 'Copy to Clipboard'}
                    </button>
                </div>

            </div>
        </div>
    );
}