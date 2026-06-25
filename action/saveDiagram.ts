'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function saveDiagram() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new Error("Unauthorized. Please log in to create diagrams.");
        }

        // Generate a safe, unique title instantly
        const uniqueTitle = `Untitled Diagram - ${Math.floor(1000 + Math.random() * 9000)}`;

        const newDiagram = await prisma.diagram.create({
            data: {
                title: uniqueTitle,
                userId: session.user.id,
                // nodes and edges default to empty in Prisma!
            }
        });

        return { success: true, diagramId: newDiagram.id };

    } catch (error) {
        console.error("Failed to create diagram:", error);
        return { success: false, error: "Database error occurred" };
    }
}