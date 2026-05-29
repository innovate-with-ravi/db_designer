import { Node, Edge } from '@xyflow/react';
import React from 'react';
import useDiagramStore from '@/store/useDiagramStore';

interface Entity extends Node {
    attributes: Node[];
    foreignKeys: [];
}

export const compileDiagramState = (nodes: Node[], edges: Edge[]): Entity[] => {
    // Replace your variable declarations with this:
    let nodeDirectory: Record<string, Node> = {};
    let compressedEntities: Record<string, Entity> = {};

    // Step 1: Initialize the Maps
    for (const node of nodes) {
        nodeDirectory[node.id] = node;

        if (node.type === 'entity') {
            compressedEntities[node.id] = {
                ...node,
                attributes: [
                    ...(node.data.hiddenAttributes as any || [])
                ],
                foreignKeys: []
            }
        }
    }


    // Step 2: Traverse the Edges
    edges.forEach((edge) => {

        const srcNode = nodeDirectory[edge.source];
        const tgtNode = nodeDirectory[edge.target];

        // If either node is missing from our directory, skip this edge entirely!
        if (!srcNode || !tgtNode) return;

        // Now TypeScript is happy, and you can safely check the types
        const src_type = srcNode.type;
        const tgt_type = tgtNode.type;

        const entity_id = src_type == 'entity' ? edge.source : edge.target
        const attribute_id = src_type == 'attribute' ? edge.source : edge.target

        if ((src_type == 'entity' && tgt_type == 'attribute') || (tgt_type == 'entity' && src_type == 'attribute'))
            compressedEntities[entity_id].attributes.push(nodeDirectory[attribute_id])
    })

    return Object.values(compressedEntities);
}