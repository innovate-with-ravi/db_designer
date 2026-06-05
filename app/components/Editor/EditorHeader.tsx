"use client";

import { useTransition, useEffect, useRef, useState, useMemo } from "react";
import { saveDiagram } from "@/action/saveDiagram";
import { useRouter } from 'next/navigation'
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

    // 🌟 1. THE DATA HASH: Strip out all React Flow "noise" (selected, dragging, measured, width).
    // This string will ONLY change if a position, label, attribute, or edge actually changes.
    const currentPayloadString = useMemo(() => {
        const cleanNodes = nodes.map(n => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data
        }));

        const cleanEdges = edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: e.type,
            data: e.data
        }));

        return JSON.stringify({ title, nodes: cleanNodes, edges: cleanEdges });
    }, [nodes, edges, title]);

    // 🌟 2. Keep track of the last successfully saved string
    const lastSavedPayload = useRef(currentPayloadString);
    const isFirstRender = useRef(true);

    // 🌟 3. The Auto-Save Engine
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (currentPayloadString === lastSavedPayload.current) return;

        setSyncStatus("Unsaved changes...");
        const payloadToSave = JSON.parse(currentPayloadString);

        const autoSaveTimer = setTimeout(async () => {
            if (id === 'new') {
                return; // Wait for the user to click the manual save button
            }

            if (syncStatus === 'Unsaved changes...') {
                setSyncStatus("Saving...");
                try {
                    await fetch(`/api/diagrams/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payloadToSave),
                    });
                    setSyncStatus("Saved ✅");
                    lastSavedPayload.current = currentPayloadString;
                } catch (error) {
                    setSyncStatus("Unsaved changes...");
                }
            }
        }, 3000);

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden' && syncStatus === "Unsaved changes...") {
                // 🛑 THE FIX: Don't force-save empty canvases on tab close
                if (id !== 'new') {
                    await fetch(`/api/diagrams/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payloadToSave),
                        keepalive: true
                    });
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearTimeout(autoSaveTimer);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [currentPayloadString, id, syncStatus]);

    // 🌟 4. The Force Save (Manual Override)
    const handleForceSave = () => {
        startTransition(async () => {
            setSyncStatus("Saving...");
            let result: any;
            const payloadToSave = JSON.parse(currentPayloadString);

            if (id === 'new') {
                result = await saveDiagram(title, payloadToSave.nodes, payloadToSave.edges);
                if (result.success) router.push(`/editor/${result.diagramId}`);
            } else {
                const response = await fetch(`/api/diagrams/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadToSave),
                });
                result = await response.json();
            }

            if (result.success) {
                setSyncStatus("Saved ✅");
                lastSavedPayload.current = currentPayloadString;
            } else {
                alert(`Error: ${result.error}`);
            }
        });
    };

    return (
        <header className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
            <h1 className="text-xl font-bold">{title || "Untitled Diagram"}</h1>

            <div className="btns flex gap-5 mx-5">
                <button
                    onClick={handleForceSave}
                    disabled={isPending || syncStatus === "Saved ✅"}
                    className={`font-semibold px-5 py-2 rounded-md transition-colors ${syncStatus === "Saved ✅"
                        ? "bg-slate-800 text-slate-400 cursor-default"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                        }`}
                >
                    {isPending ? "Saving..." : syncStatus}
                </button>

                <ThemeToggle />
            </div>
        </header>
    );
}