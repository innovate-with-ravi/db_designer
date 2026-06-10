"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProjectButton({ diagramId, diagramTitle }: { diagramId: string, diagramTitle: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); // Stop the Link wrapper from navigating to the editor!
        e.stopPropagation();// Stop event bubbling

        const confirmDelete = window.confirm(`Are you sure you want to delete "${diagramTitle}"? This cannot be undone.`);
        if (!confirmDelete) return;

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/diagrams/${diagramId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                // Instantly refresh the Server Component to show the updated list
                router.refresh();
            } else {
                alert("Failed to delete the project.");
                setIsDeleting(false);
            }
        } catch (error) {
            console.error("Error deleting:", error);
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`absolute top-4 right-4 p-2 rounded-md bg-background/80 backdrop-blur border border-border shadow-sm transition-all z-10 
                ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive hover:border-destructive/50'}`}
            title="Delete Project"
        >
            {isDeleting ? "⏳" : "🗑️"}
        </button>
    );
}