"use client";

import { useTransition, useEffect, useRef, useState, useMemo } from "react";
import { saveDiagram } from "@/action/saveDiagram";
import { useRouter } from 'next/navigation'
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

type EditorHeaderProps = {
    id: string;
    title: string;
    nodes: any[];
    edges: any[];
}

export default function EditorHeader({ id, title, nodes, edges }: EditorHeaderProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [syncStatus, setSyncStatus] = useState<"Saved ✅" | "Unsaved changes..." | "Saving...">("Saved ✅");

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

        setSyncStatus("Unsaved changes...");
        const payloadToSave = JSON.parse(currentPayloadString);

        const autoSaveTimer = setTimeout(async () => {
            if (id === 'new') return;
            if (syncStatus === 'Unsaved changes...') {
                setSyncStatus("Saving...");
                try {
                    await fetch(`/api/diagrams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadToSave) });
                    setSyncStatus("Saved ✅");
                    lastSavedPayload.current = currentPayloadString;
                } catch (error) { setSyncStatus("Unsaved changes..."); }
            }
        }, 3000);

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden' && syncStatus === "Unsaved changes...") {
                if (id !== 'new') {
                    await fetch(`/api/diagrams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadToSave), keepalive: true });
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => { clearTimeout(autoSaveTimer); document.removeEventListener("visibilitychange", handleVisibilityChange); };
    }, [currentPayloadString, id, syncStatus]);

    const handleForceSave = () => {
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

            {/* Right Side: Save Button & Theme */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleForceSave}
                    disabled={isPending || syncStatus === "Saved ✅"}
                    className={`text-sm font-bold px-4 py-1.5 rounded-full transition-all ${syncStatus === "Saved ✅"
                        ? "bg-surface text-muted-foreground border border-surface-border cursor-default"
                        : "bg-brand-emerald hover:opacity-90 text-background shadow-md shadow-brand-emerald/20"
                        }`}
                >
                    {isPending ? "Saving..." : syncStatus}
                </button>

                <div className="h-6 w-px bg-border hidden sm:block" />

                <ThemeToggle />
            </div>
        </header>
    );
}