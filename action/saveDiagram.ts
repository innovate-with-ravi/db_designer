'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function saveDiagram(title: string, nodes: any[], edges: any[]) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new Error("Unauthorized. Please log in to save diagrams.");
        }

        const userId = session.user.id;

        if (!nodes.length)
            throw new Error("Can't save an EMPTY Diagram.");

        // check if title not given
        if (title === 'Untitled Diagram') {
            throw new Error("Please give a NAME to Diagram");
        }

        // 🌟 THE FIX: Scope the uniqueness check to the current user!
        const existingDiagram = await prisma.diagram.findFirst({
            where: {
                title: title,
                userId: userId
            }
        });

        if (existingDiagram) {
            throw new Error(`You already have a diagram named "${title}". Please choose a unique name.`);
        }

        const newDiagram = await prisma.diagram.create({
            data: {
                title: title,
                userId: userId,
                nodes: {
                    create: nodes.map(node => ({
                        id: node.id,
                        type: node.type,
                        label: node.data.label || 'Unnamed',
                        x_pos: node.position.x,
                        y_pos: node.position.y,
                        node_data_json: node.data,
                    }))
                },
                edges: {
                    create: edges.map(edge => ({
                        id: edge.id,
                        source_node: edge.source,
                        target_node: edge.target,
                        source_cardinality: edge.data?.sourceMaximumCardinality || '1',
                        target_cardinality: edge.data?.targetMaximumCardinality || 'N',
                        label: edge.data?.label || 'REL',
                        type: edge.type || 'default',
                        source_handle: edge.sourceHandle || null,
                        target_handle: edge.targetHandle || null,
                    }))
                }
            }
        });

        return { success: true, diagramId: newDiagram.id };

    } catch (error) {
        console.error("Failed to save diagram:", error);
        // Safely extract the exact error message we threw above
        const message = error instanceof Error ? error.message : "Database error occurred";
        return { success: false, error: message };
    }
}