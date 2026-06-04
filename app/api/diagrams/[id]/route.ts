import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import React from 'react';

// ----------------------------------------------------------------------
// DELETE: Deletes a specific project
// ----------------------------------------------------------------------
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        // 1. Authenticate the Request
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params
        const diagramId = id;
        console.log("diagramId:", diagramId);

        // 2. Security Check: Does this diagram actually belong to the user trying to delete it?
        const existingDiagram = await prisma.diagram.findUnique({ where: { id: diagramId } });

        if (!existingDiagram) {
            return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
        }

        if (existingDiagram.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden: You do not own this diagram" }, { status: 403 });
        }

        // 3. Execute the Cascade Delete
        await prisma.diagram.delete({
            where: { id: diagramId }
        });

        return NextResponse.json({ success: true, message: "Diagram deleted perfectly." }, { status: 200 });

    } catch (error) {
        console.error("DELETE API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// PUT: Updates/Auto-Saves a specific project
// ----------------------------------------------------------------------
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        // 1. Authenticate
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params
        const diagramId = id;

        // 2. Parse the incoming JSON body from the frontend -> comes in string fromat JSON.stringigy({obj})
        const body = await request.json();
        const { title, nodes, edges } = body;

        /**
         * figuring out exactly which nodes were moved, deleted, or added by the user is a mathematical nightmare. The 80/20 solution for canvas-saving is to tell Prisma: "Wipe the old canvas children clean, and instantly insert this new snapshot."
         */

        // 3. Update the Diagram
        // To do a "clean update" of relations in Prisma, 
        // 1. we often delete the old child rows 
        // 2. and create the new ones, ensuring no "ghost" nodes are left behind if a user deleted a table.
        const updatedDiagram = await prisma.diagram.update({
            where: {
                id: diagramId,
                userId: session.user.id // Extra security layer built into the query
            },
            data: {
                title: title,
                // Delete all existing nodes/edges...
                nodes: { deleteMany: {} },
                edges: { deleteMany: {} },
            }
        });

        // 4. Re-insert the fresh canvas state
        await prisma.diagram.update({
            where: { id: diagramId },
            data: {
                nodes: {
                    create: nodes.map((node: any) => ({
                        id: node.id,
                        type: node.type,
                        label: node.data.label || 'Unnamed',
                        x_pos: node.position.x,
                        y_pos: node.position.y,
                        node_data_json: node.data,
                    }))
                },
                edges: {
                    create: edges.map((edge: any) => ({
                        id: edge.id,
                        source_node: edge.source,
                        target_node: edge.target,
                        source_cardinality: edge.data?.sourceMaximumCardinality || '1',
                        target_cardinality: edge.data?.targetMaximumCardinality || 'N',
                        label: edge.data?.label || 'REL',
                        type: edge.type || 'default',

                        // 🌟 Catch the exact connection ports
                        source_handle: edge.sourceHandle || null,
                        target_handle: edge.targetHandle || null,
                    }))
                }
            }
        });

        return NextResponse.json({ success: true, diagram: updatedDiagram }, { status: 200 });

    } catch (error) {
        console.error("PUT API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}