"use client";

import { useTransition, useEffect, useRef, useState, useMemo } from "react";
// import { useRouter } from 'next/navigation'
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

import { Undo2, Redo2, HelpCircle, X } from 'lucide-react';
import useDiagramStore from "@/store/useDiagramStore";
import AiGeneratorModal from './AiGeneratorModal';

type EditorHeaderProps = {
    id: string;
    title: string;
    nodes: any[];
    edges: any[];
    onExportClick: () => void;
    onAiExportClick: () => void;
}

export default function EditorHeader({ id, title, nodes, edges, onExportClick, onAiExportClick }: EditorHeaderProps) {

    const [isPending, startTransition] = useTransition();
    const [syncStatus, setSyncStatus] = useState<"Saved ✅" | "Unsaved" | "Saving...">("Saved ✅");

    const [showTips, setShowTips] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [localTitle, setLocalTitle] = useState(title || "Untitled Diagram");

    // 🌟 NEW: The First-Time User Experience (FTUE) Check
    useEffect(() => {
        const hasSeenTips = localStorage.getItem('hasSeenTips');
        if (!hasSeenTips) {
            setShowTips(true); // Auto-open on very first visit
        }
    }, []);

    // 🌟 NEW: Close handler that seals the local storage flag forever
    const closeTips = () => {
        setShowTips(false);
        localStorage.setItem('hasSeenTips', 'true');
    };

    const currentPayloadString = useMemo(() => {
        const cleanNodes = nodes.map(n => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
            parentId: n.parentId,
            extent: n.extent,
            measured: n.measured,
            style: n.style
        }));
        const cleanEdges = edges.map(e => ({
            id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, type: e.type, data: e.data
        }));
        return JSON.stringify({ title: localTitle, nodes: cleanNodes, edges: cleanEdges });
    }, [nodes, edges, localTitle]);

    const lastSavedPayload = useRef(currentPayloadString);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (currentPayloadString === lastSavedPayload.current) return;

        setSyncStatus("Unsaved");
        const payloadToSave = JSON.parse(currentPayloadString);

        const autoSaveTimer = setTimeout(async () => {
            if (syncStatus === 'Unsaved') {
                setSyncStatus("Saving...");
                try {
                    const response = await fetch(`/api/diagrams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadToSave) });
                    const result = await response.json();

                    if (result.success) {
                        setSyncStatus("Saved ✅");
                        lastSavedPayload.current = currentPayloadString;
                        if (result.diagram?.title && result.diagram.title !== localTitle) {
                            setLocalTitle(result.diagram.title);
                        }
                    } else {
                        setSyncStatus("Unsaved");
                    }
                } catch (error) { setSyncStatus("Unsaved"); }
            }
        }, 3000);

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden' && syncStatus === "Unsaved") {
                await fetch(`/api/diagrams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadToSave), keepalive: true });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => { clearTimeout(autoSaveTimer); document.removeEventListener("visibilitychange", handleVisibilityChange); };
    }, [currentPayloadString, id, syncStatus]);

    const handleForceSave = () => {
        if (syncStatus != 'Unsaved') return;

        startTransition(async () => {
            setSyncStatus("Saving...");
            const payloadToSave = JSON.parse(currentPayloadString);

            try {
                const response = await fetch(`/api/diagrams/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadToSave)
                });
                const result = await response.json();

                if (result.success) {
                    setSyncStatus("Saved ✅");
                    lastSavedPayload.current = currentPayloadString;
                    if (result.diagram?.title && result.diagram.title !== localTitle) {
                        setLocalTitle(result.diagram.title);
                    }
                } else {
                    setSyncStatus("Unsaved");
                    alert(`Error: ${result.error}`);
                }
            } catch (error) {
                setSyncStatus("Unsaved");
                alert("Failed to save diagram.");
            }
        });
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

            if (cmdOrCtrl && event.key.toLowerCase() === 's') {
                event.preventDefault()
                if (syncStatus == 'Unsaved') {
                    handleForceSave()
                    setSyncStatus('Saved ✅')
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleForceSave, syncStatus]);

    const { undo, redo, past, future } = useDiagramStore();
    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    return (
        <>
            <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 bg-background text-foreground border-b border-border transition-colors duration-300 relative z-10">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-6 h-6 rounded bg-gradient-to-tr from-brand-blue to-brand-emerald shrink-0" />
                    </Link>

                    <div className="h-6 w-px bg-border" />

                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onKeyDown={(e: any) => {
                                if (e.code == 'Enter' || e.code == "Escape") {
                                    handleForceSave();
                                    e.target.blur();
                                }
                            }}
                            className="text-sm font-bold leading-tight bg-transparent border-none outline-none focus:ring-2 focus:ring-brand-blue/50 rounded px-1 -ml-1 transition-all w-48 sm:w-64"
                            placeholder="Name your diagram..."
                            title="Rename Diagram"
                        />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest pl-1">Workspace</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">

                    <button
                        onClick={() => setShowTips(true)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
                        title="Shortcuts & Tips"
                    >
                        <HelpCircle size={20} />
                    </button>

                    <div className="flex items-center gap-1 border-r border-border pr-3 sm:pr-4">
                        <button onClick={() => undo()} disabled={!canUndo} className={`p-2 rounded-md transition-colors ${canUndo ? 'text-foreground hover:bg-surface-hover' : 'text-muted-foreground opacity-50 cursor-not-allowed'}`} title="Undo (Ctrl+Z)">
                            <Undo2 size={18} />
                        </button>
                        <button onClick={() => redo()} disabled={!canRedo} className={`p-2 rounded-md transition-colors ${canRedo ? 'text-foreground hover:bg-surface-hover' : 'text-muted-foreground opacity-50 cursor-not-allowed'}`} title="Redo (Ctrl+Y)">
                            <Redo2 size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAiModalOpen(true)}
                        className="text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full transition-all bg-brand-indigo hover:opacity-90 text-white shadow-md shadow-brand-indigo/20 flex items-center gap-1"
                        title="Generate ER Diagram with AI"
                    >
                        ✨ AI Generate
                    </button>

                    <button onClick={onAiExportClick} className="text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full transition-all bg-brand-purple hover:opacity-90 text-white shadow-md shadow-brand-purple/20 flex items-center gap-1" title="Export AI Refined SQL">
                        ✨ AI Export
                    </button>

                    <button onClick={onExportClick} className="text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full transition-all bg-brand-blue hover:opacity-90 text-white shadow-md shadow-brand-blue/20" title="Export Code">
                        Export
                    </button>

                    <button onClick={handleForceSave} disabled={isPending || syncStatus === "Saved ✅"} className={`text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full transition-all w-28 sm:w-30 ${syncStatus === "Saved ✅" ? "bg-surface text-muted-foreground border border-surface-border cursor-not-allowed" : "bg-brand-emerald hover:opacity-90 text-background shadow-md shadow-brand-emerald/20"}`} title="Save (Ctrl+S)">
                        {isPending ? "Saving..." : syncStatus}
                    </button>

                    <div className="h-6 w-px bg-border hidden sm:block" />
                    <Link href="/dashboard" className="hover:text-foreground transition-colors text-sm font-medium text-muted-foreground hidden sm:block">
                        Dashboard
                    </Link>
                    <div className="h-6 w-px bg-border hidden sm:block" />
                    <ThemeToggle />
                </div>
            </header>

            {showTips && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="absolute inset-0" onClick={closeTips} />

                    <div className="relative bg-background border border-border shadow-2xl rounded-2xl w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in duration-200">

                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                <HelpCircle className="text-brand-blue" size={28} />
                                Canvas Controls
                            </h2>
                            <button
                                onClick={closeTips}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground text-base font-medium">Select a Single Item</span>
                                <span className="bg-surface px-3 py-1.5 rounded-md text-sm font-mono font-bold text-foreground border border-border shadow-sm">Click item</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground text-base font-medium">Select Multiple Items</span>
                                <span className="bg-surface px-3 py-1.5 rounded-md text-sm font-mono font-bold text-foreground border border-border shadow-sm">Ctrl + Drag Mouse</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground text-base font-medium">Delete Selected</span>
                                <span className="bg-surface px-3 py-1.5 rounded-md text-sm font-mono font-bold text-foreground border border-border shadow-sm">Backspace / Delete</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground text-base font-medium">Save Diagram</span>
                                <span className="bg-surface px-3 py-1.5 rounded-md text-sm font-mono font-bold text-foreground border border-border shadow-sm">Ctrl + S</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground text-base font-medium">Undo Action</span>
                                <span className="bg-surface px-3 py-1.5 rounded-md text-sm font-mono font-bold text-foreground border border-border shadow-sm">Ctrl + Z</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground text-base font-medium">Redo Action</span>
                                <span className="bg-surface px-3 py-1.5 rounded-md text-sm font-mono font-bold text-foreground border border-border shadow-sm">Ctrl + Y</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground text-base font-medium">Pan Canvas</span>
                                <span className="bg-surface px-3 py-1.5 rounded-md text-sm font-mono font-bold text-foreground border border-border shadow-sm">Click & Drag Bg</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-muted-foreground text-base font-medium">Zoom Canvas</span>
                                <span className="bg-surface px-3 py-1.5 rounded-md text-sm font-mono font-bold text-foreground border border-border shadow-sm">Scroll Wheel</span>
                            </div>
                        </div>

                        <button
                            onClick={closeTips}
                            className="w-full mt-8 bg-brand-blue text-white text-lg font-bold py-3 rounded-xl shadow-lg hover:opacity-90 hover:shadow-brand-blue/20 transition-all"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}

            <AiGeneratorModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
        </>
    );
}