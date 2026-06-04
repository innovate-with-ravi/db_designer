"use client";

import { useTransition } from "react";
import { saveDiagram } from "@/action/saveDiagram";
import { useRouter } from 'next/navigation'

type EditorHeaderProps = {
    id: string;
    title: string;
    nodes: any[];
    edges: any[];
}

export default function EditorHeader({ id, title, nodes, edges }: EditorHeaderProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter()

    const handleSave = () => {
        startTransition(async () => {
            let result: any;

            if (id === 'new') {
                result = await saveDiagram(title, nodes, edges);// it's a serverAction => no .json() parsing
                if (result.success) {
                    router.push(`/editor/${result.diagramId}`);
                }
            } else {
                // 1. Await the network response
                const response = await fetch(`/api/diagrams/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, nodes, edges }),
                });

                // 2. Await the JSON body parsing!
                result = await response.json();// parse response to json
            }

            if (result.success) {
                // Unify the ID depending on whether it came from the Action or the API
                const savedId = result.diagramId || result.diagram?.id;
                alert(`Diagram saved successfully! Generated ID: ${savedId}`);
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