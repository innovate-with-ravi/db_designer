import { Node, Edge } from '@xyflow/react';

export interface Entity extends Node {
    attributes: Node[];
    foreignKeys: [];
}

export const compileDiagramState = (nodes: Node[], edges: Edge[]): Entity[] => {
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

    // Step 2 & 3: The Outward Graph Traversal
    // Instead of trusting edge direction, we start at the Entity and flow outward!
    edges.forEach((edge) => {
        const srcNode = nodeDirectory[edge.source];
        const tgtNode = nodeDirectory[edge.target];
        if (!srcNode || !tgtNode) return;

        let entity: Entity | null = null;
        let topLevelAttr: Node | null = null;

        // Find the "Roots" (Attributes directly connected to an Entity)
        if (srcNode.type === 'entity' && tgtNode.type === 'attribute') {
            entity = compressedEntities[srcNode.id];
            topLevelAttr = tgtNode;
        } else if (tgtNode.type === 'entity' && srcNode.type === 'attribute') {
            entity = compressedEntities[tgtNode.id];
            topLevelAttr = srcNode;
        }

        if (entity && topLevelAttr) {
            // Track visited nodes to prevent infinite loops if the user draws a circle
            const visited = new Set<string>();

            const traverseAttribute = (attr: Node, prefix: string = '') => {
                if (visited.has(attr.id)) return;
                visited.add(attr.id);

                const rawType = String(attr.data?.attributeType || '').toLowerCase().trim();

                if (rawType === 'composite') {
                    // Create the evolving prefix (e.g., 'address_coordinates_')
                    const newPrefix = prefix + (attr.data?.label || 'Composite') + '_';

                    // Find all attributes connected to this composite (ignoring direction!)
                    const connectedEdges = edges.filter(e => e.source === attr.id || e.target === attr.id);

                    connectedEdges.forEach(e => {
                        const otherNodeId = e.source === attr.id ? e.target : e.source;
                        const otherNode = nodeDirectory[otherNodeId];

                        // Crawl deeper ONLY into attributes we haven't visited yet
                        if (otherNode && otherNode.type === 'attribute' && !visited.has(otherNodeId)) {
                            traverseAttribute(otherNode, newPrefix);
                        }
                    });
                } else {
                    // Base Case: It's a physical scalar attribute
                    let resolvedAttr: any = JSON.parse(JSON.stringify(attr)); // Deep copy
                    if (prefix) {
                        const flattenedName = prefix + (attr.data?.label || 'Attr');
                        resolvedAttr.data.label = flattenedName;
                        resolvedAttr.name = flattenedName; // Update name for the SQL normalizer
                    }

                    // We can safely use the entity captured in the outer scope
                    entity!.attributes.push(resolvedAttr);
                }
            };

            // Launch the traversal from the root attribute
            traverseAttribute(topLevelAttr, '');
        }
    });

    return Object.values(compressedEntities);
}