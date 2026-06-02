"use client";

import { useTransition } from "react";
import { saveDiagram } from "@/action/saveDiagram";

type EditorHeaderProps = {
    title: string;
    nodes: any[];
    edges: any[];
}

export default function EditorHeader({ title, nodes, edges }: EditorHeaderProps) {
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        // Trigger the server action inside a transition for native loading handling

        // when startTransition is running, isPending auto. becomes true
        startTransition(async () => {
            const result = await saveDiagram(title, nodes, edges);

            if (result.success) {
                alert(`Diagram saved successfully! Generated ID: ${result.diagramId}`);
            } else {
                alert(`Error: ${result.error}`);
            }
        });
    };

    return (
        <header className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
            <h1 className="text-xl font-bold">{title || "Untitled Diagram"}</h1>

            <button
                onClick={handleSave}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-semibold px-5 py-2 rounded-md transition-colors"
            >
                {isPending ? "Saving to MySQL..." : "Save Diagram"}
            </button>
        </header>
    );
}