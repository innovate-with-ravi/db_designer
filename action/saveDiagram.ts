'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function saveDiagram(title: string, nodes: any[], edges: any[]) {
    try {
        // 1. Gatekeeper: Ensure the user is logged in
        const session = await auth();
        if (!session?.user?.id) {// fix: session's user obj don't have an id
            throw new Error("Unauthorized. Please log in to save diagrams.");
        }

        const userId = session.user.id;

        // 2. The Prisma Transaction: Save everything atomically
        const newDiagram = await prisma.diagram.create({
            data: {
                // id by default
                title: title,
                userId: userId,
                // Prisma allows us to create the child nodes and edges at the exact same time!
                nodes: {
                    create: nodes.map(node => ({
                        id: node.id,
                        type: node.type,
                        label: node.data.label || 'Unnamed',
                        x_pos: node.position.x,
                        y_pos: node.position.y,
                        // Save all extra custom data (hidden attributes, primary keys) as JSON
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
                    }))
                }
            }
        });

        return { success: true, diagramId: newDiagram.id };

    } catch (error) {
        console.error("Failed to save diagram:", error);
        return { success: false, error: "Database error occurred." };
    }
}