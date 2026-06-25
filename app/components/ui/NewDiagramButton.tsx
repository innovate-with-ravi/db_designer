'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveDiagram } from '@/action/saveDiagram';

export default function NewDiagramButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async () => {
        setIsLoading(true);
        const result = await saveDiagram();

        if (result.success && result.diagramId) {
            router.push(`/editor/${result.diagramId}`);
        } else {
            alert(result.error || "Failed to create diagram");
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleCreate}
            disabled={isLoading}
            className="w-full sm:w-auto text-center bg-brand-blue text-white px-6 py-3 rounded-lg font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
        >
            {isLoading ? 'Creating...' : '+ New Diagram'}
        </button>
    );
}