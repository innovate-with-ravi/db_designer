"use client";

import { useTransition, useEffect, useRef, useState, useMemo } from "react";
import { saveDiagram } from "@/action/saveDiagram";
import { useRouter } from 'next/navigation'
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

// Notice we use `useStore` here to make the buttons re-render when history states change
import { useStore } from 'zustand';
import { Undo2, Redo2 } from 'lucide-react'; // Make sure to import these!
import useDiagramStore from "@/store/useDiagramStore";

type EditorHeaderProps = {
    id: string;
    title: string;
    nodes: any[];
    edges: any[];
}

export default function EditorHeader({ id, title, nodes, edges }: EditorHeaderProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [syncStatus, setSyncStatus] = useState<"Saved ✅" | "Unsaved" | "Saving...">("Saved ✅");

    // ... (KEEP ALL YOUR EXISTING AUTOSAVE/MEMO/EFFECT LOGIC HERE - IT IS PERFECT) ...
    const currentPayloadString = useMemo(() => {
        const cleanNodes = nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data }));
        const cleanEdges = edges.map(e => ({
            id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, type: e.type, data: e.data
        }));
        return JSON.stringify({ title, nodes: cleanNodes, edges: cleanEdges });
    }, [nodes, edges, title]);

    const lastSavedPayload = useRef(currentPayloadString);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (currentPayloadString === lastSavedPayload.current) return;

        setSyncStatus("Unsaved");
        const payloadToSave = JSON.parse(currentPayloadString);

        const autoSaveTimer = setTimeout(async () => {
            if (id === 'new') return;
            if (syncStatus === 'Unsaved') {
                setSyncStatus("Saving...");
                try {
                    await fetch(`/api/diagrams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadToSave) });
                    setSyncStatus("Saved ✅");
                    lastSavedPayload.current = currentPayloadString;
                } catch (error) { setSyncStatus("Unsaved"); }
            }
        }, 3000);

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden' && syncStatus === "Unsaved") {
                if (id !== 'new') {
                    await fetch(`/api/diagrams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadToSave), keepalive: true });
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => { clearTimeout(autoSaveTimer); document.removeEventListener("visibilitychange", handleVisibilityChange); };
    }, [currentPayloadString, id, syncStatus]);


    const handleForceSave = () => {
        if (syncStatus != 'Unsaved') return;

        startTransition(async () => {
            setSyncStatus("Saving...");
            let result: any;
            const payloadToSave = JSON.parse(currentPayloadString);

            if (id === 'new') {
                result = await saveDiagram(title, payloadToSave.nodes, payloadToSave.edges);
                if (result.success) router.push(`/editor/${result.diagramId}`);
            } else {
                const response = await fetch(`/api/diagrams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadToSave) });
                result = await response.json();
            }

            if (result.success) {
                setSyncStatus("Saved ✅");
                lastSavedPayload.current = currentPayloadString;
            } else { alert(`Error: ${result.error}`); }
        });
    };

    // 🌟 THE KEYBOARD LISTENER
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if user is typing inside an input field (we don't want to undo canvas if they are just typing a name!)
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
    }, [handleForceSave]);

    // Grab the state directly:
    const { undo, redo, past, future } = useDiagramStore();

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    return (
        <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 bg-background text-foreground border-b border-border transition-colors duration-300">

            {/* Left Side: Logo + Divider + ER Diagram Title */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-6 h-6 rounded bg-gradient-to-tr from-brand-blue to-brand-emerald shrink-0" />
                </Link>

                <div className="h-6 w-px bg-border" /> {/* Subtle vertical divider */}

                <div className="flex flex-col">
                    <h1 className="text-sm font-bold leading-tight">{title || "Untitled Diagram"}</h1>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Workspace</span>
                </div>
            </div>

            {/* Right Side: Save Button, undo-redo & Theme */}
            <div className="flex items-center gap-4">

                {/* 🌟 3. The Time Travel Buttons */}
                <div className="flex items-center gap-1 border-r border-border pr-4 mr-2">
                    <button
                        onClick={() => undo()}
                        disabled={!canUndo}
                        className={`p-2 rounded-md transition-colors ${canUndo ? 'text-foreground hover:bg-surface-hover' : 'text-muted-foreground opacity-50 cursor-not-allowed'}`}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={18} />
                    </button>
                    <button
                        onClick={() => redo()}
                        disabled={!canRedo}
                        className={`p-2 rounded-md transition-colors ${canRedo ? 'text-foreground hover:bg-surface-hover' : 'text-muted-foreground opacity-50 cursor-not-allowed'}`}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo2 size={18} />
                    </button>
                </div>

                {/* ... Save Button and Theme Toggle ... */}
                <button
                    onClick={handleForceSave}
                    disabled={isPending || syncStatus === "Saved ✅"}
                    className={`text-sm font-bold px-4 py-1.5 rounded-full transition-all w-30 ${syncStatus === "Saved ✅"
                        ? "bg-surface text-muted-foreground border border-surface-border cursor-not-allowed"
                        : "bg-brand-emerald hover:opacity-90 text-background shadow-md shadow-brand-emerald/20"
                        }`}
                    title="Save (Ctrl+S)"
                >
                    {isPending ? "Saving..." : syncStatus}
                </button>

                <div className="h-6 w-px bg-border hidden sm:block" />

                <ThemeToggle />
            </div>
        </header>
    );
}