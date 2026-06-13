"use client";

import { useEffect, useState } from "react";
import useDiagramStore from "@/store/useDiagramStore";
import { compileDiagramState } from "@/lib/compiler";
import { generateSQL } from "@/lib/sqlGenerator";
import { generatePrisma } from "@/lib/prismaGenerator";
import { generateSqlHtml } from "@/action/generateSqlHtml"; // 🌟 Import the action here!
import React from "react";
import SqlCodeBlock from "./SqlCodeBlock";

// Notice we removed htmlCode from the props!
export default function ExportModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { nodes, edges, exportDialect, setExportDialect } = useDiagramStore();
    const [copied, setCopied] = useState(false);

    // Local state to manage the outputs dynamically
    const [htmlCode, setHtmlCode] = useState<string>("");
    const [rawCode, setRawCode] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);

    // 🌟 The React Fix: The Modal manages its own recompilation when the dialect changes
    useEffect(() => {
        if (!isOpen) return;

        const generate = async () => {
            setIsGenerating(true);
            try {
                const compiledEntities = compileDiagramState(nodes, edges);
                let finalCode = "";

                if (exportDialect === 'prisma') {
                    finalCode = generatePrisma(compiledEntities, edges);
                } else {
                    finalCode = generateSQL(compiledEntities, edges, exportDialect);
                }

                setRawCode(finalCode);
                const html = await generateSqlHtml(finalCode); // Fetch the color coding!
                setHtmlCode(html);
            } catch (error) {
                setRawCode("-- Error compiling diagram.");
                setHtmlCode("<div><span style='color: red;'>-- Error compiling diagram. Ensure all tables have Primary Keys.</span></div>");
            } finally {
                setIsGenerating(false);
            }
        };

        generate();
    }, [nodes, edges, exportDialect, isOpen]);

    const handleCopy = () => {
        navigator.clipboard.writeText(rawCode); // Copy the raw string, not HTML tags!
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-border w-[800px] max-w-[90vw] rounded-xl shadow-2xl overflow-hidden flex flex-col">

                {/* Header & Controls */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
                    <h2 className="text-lg font-bold text-foreground">Export Code</h2>

                    <div className="flex items-center gap-4">
                        <select
                            value={exportDialect}
                            onChange={(e) => setExportDialect(e.target.value as any)}
                            className="bg-background border border-border text-foreground text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        >
                            <option value="mysql">MySQL</option>
                            <option value="oracle">Oracle SQL</option>
                            <option value="prisma">Prisma Schema</option>
                        </select>

                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Code Window */}
                <div className="p-6 bg-zinc-950 overflow-y-auto max-h-[60vh] relative group">
                    {isGenerating ? (
                        <div className="text-emerald-400 font-mono text-sm animate-pulse">Compiling...</div>
                    ) : (
                        <SqlCodeBlock html={htmlCode} />
                    )}

                    <button
                        onClick={handleCopy}
                        disabled={isGenerating}
                        className={`absolute top-4 right-4 px-6 py-2 rounded font-bold text-white transition opacity-0 group-hover:opacity-100 ${copied ? 'bg-brand-emerald' : 'bg-brand-blue hover:opacity-90'}`}
                    >
                        {copied ? 'Copied! ✓' : 'Copy Code'}
                    </button>
                </div>

            </div>
        </div>
    );
}