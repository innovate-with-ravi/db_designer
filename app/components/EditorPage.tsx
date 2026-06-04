"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { ReactFlow, Background, Controls, ReactFlowProvider, useReactFlow, ConnectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useDiagramStore from '@/store/useDiagramStore';
import EntityNode from '@/app/components/nodes/EntityNode';
import AttributeNode from '@/app/components/nodes/AttributeNode';
import Sidebar from '@/app/components/ui/LeftSidebar';
import PropertiesPanel from '@/app/components/ui/PropertiesPanel';
import RelationshipEdge from '@/app/components/edges/RelationshipEdge';

import { generateMySQL } from '@/lib/sqlGenerator';
import { compileDiagramState } from '@/lib/compiler';
import { generateSqlHtml } from '@/action/generateSqlHtml';
import SqlOutputModal from '@/app/components/ui/SqlOutputModal';

import ValidationConsole from '@/app/components/ui/ValidationConsole';

import { databaseSchema } from '@/lib/schema';
import { ValidationError } from '@/store/useDiagramStore';
import EditorHeader from '@/app/components/EditorHeader';
import { getDiagramById } from '@/action/loadDiagram';
import { useParams } from 'next/navigation';


// Define these OUTSIDE the component to prevent unnecessary recreation
const nodeTypes = {
    entity: EntityNode,
    attribute: AttributeNode,
};

const edgeTypes = {
    relationship: RelationshipEdge,
};

// We create an inner component to handle the canvas logic so we can use the useReactFlow hook
function DnDCanvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useDiagramStore();
    const { screenToFlowPosition } = useReactFlow(); // The magic coordinate math hook!

    const onDragOver = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            event.dataTransfer.dropEffect = 'move';
        }
        , []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            // 1. Get the payload from the mouse pointer
            const type = event.dataTransfer.getData('application/reactflow/type');
            const attributeType = event.dataTransfer.getData('application/reactflow/attributeType');
            const entityType = event.dataTransfer.getData('application/reactflow/entityType');

            if (!type) return;

            // 2. Calculate exact canvas coordinates based on zoom and pan
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // 3. Create the new node object
            const newNode = {
                id: `node-${Date.now()}`, // Generate a unique ID
                type,
                position,
                data: {
                    label: type === 'entity' ? 'New Entity' : 'new_attr',
                    attributeType: attributeType || 'simple',
                    entityType: entityType || 'standard'
                },
            };

            // 4. Send it to Zustand!
            addNode(newNode);
        },
        [screenToFlowPosition, addNode],
    );

    // State for showing PK exists modal (outside validation logic)
    const [showPKModal, setShowPKModal] = React.useState(false);

    const isValidConnection = useCallback((connection: any) => {
        // 1. Grab the current state (only using useDiagramStore.getState()) directly from the store
        const { nodes, edges } = useDiagramStore.getState();

        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        if (!sourceNode || !targetNode) return false;

        // Prevent connecting attribute to attribute
        if (sourceNode.type == 'attribute' && targetNode.type == 'attribute') return false;

        // 2. Are they connecting an Entity to an Attribute?
        const isEntityToAttr =
            (sourceNode.type === 'entity' && targetNode.type === 'attribute') ||
            (sourceNode.type === 'attribute' && targetNode.type === 'entity');

        // If it's a relationship between two entities, let it connect instantly!
        if (!isEntityToAttr) return true;

        // 3. Figure out which one is the Entity
        const entityId = sourceNode.type === 'entity' ? sourceNode.id : targetNode.id;

        // Is the node they are dragging a "Key" attribute?
        const draggingNode = sourceNode.id === entityId ? targetNode : sourceNode;
        const isDraggingKey = draggingNode.data?.attributeType === 'key';

        if (isDraggingKey) {
            // Check if the entity already has a Key connected
            const hasExistingKey = edges.some((edge) => {
                if (edge.source !== entityId && edge.target !== entityId) return false;

                const otherNodeId = edge.source === entityId ? edge.target : edge.source;
                const otherNode = nodes.find((n) => n.id === otherNodeId);

                return otherNode?.data?.attributeType === 'key';
            });

            // Block it if a key already exists!
            if (hasExistingKey) {
                // Show modal via state instead of calling setShowPKExists here
                setShowPKModal(true);
                // Auto-dismiss after 2 seconds
                setTimeout(() => setShowPKModal(false), 2000);
                return false;
            }
        }

        // 4. Count existing attribute lines
        let attributeLineCount = 0;

        edges.forEach((edge) => {
            // Is this edge attached to our entity?
            if (edge.source === entityId || edge.target === entityId) {
                // Find the node on the OTHER side of this edge
                const otherNodeId = edge.source === entityId ? edge.target : edge.source;
                const otherNode = nodes.find((n) => n.id === otherNodeId);

                // If the other side is an attribute, increase the count
                if (otherNode?.type === 'attribute') {
                    attributeLineCount++;
                }
            }
        });

        // If limit reached, expand the properties panel for that entity
        if (attributeLineCount >= 4) {
            const { setEntityExpanded } = useDiagramStore.getState();
            setEntityExpanded(entityId);
            return false;
        }

        return true; // Allow the connection
    }, []);

    console.log("nodes: ", nodes)
    console.log("edges: ", edges)

    return (
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
            {/* PK Exists Modal */}
            {showPKModal && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 pointer-events-none animate-fadeIn">
                    <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm mx-4 pointer-events-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-lg font-bold text-gray-800">Primary Key Exists</h3>
                        </div>
                        <p className="text-gray-600 mb-4">This entity already has a primary key attribute. Only one primary key is allowed per entity.</p>
                        <button
                            onClick={() => setShowPKModal(false)}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                        >
                            Understood
                        </button>
                    </div>
                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}

                onDrop={onDrop}         // Handle the drop
                onDragOver={onDragOver} // Allow the drop
                connectionMode={ConnectionMode.Loose}
                isValidConnection={isValidConnection}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}


export default function EditorPage() {
    const params = useParams()

    const { nodes, edges, validateDiagram, setEntityExpanded, activeExpandedEntityId, setGlobalErrors, setDiagram } = useDiagramStore();
    const [sqlOutput, setSqlOutput] = useState<{ sql: string, html: string } | null>(null);

    // The database stores data in a flat format (e.g., x_pos, y_pos), but React Flow requires a highly specific nested object (position: { x, y }). We have to write a "Data Mapper" to translate the MySQL rows back into React Flow objects.

    // 🌟 1. Add a hydration lock
    const [isHydrating, setIsHydrating] = useState(true);

    // 🌟 THE HYDRATION ENGINE
    useEffect(() => {
        const diagramId = params.id;

        const loadProject = async () => {
            if (diagramId === 'new') {
                setDiagram([], []);
                setIsHydrating(false); // Unlock UI
                return;
            }

            const response = await getDiagramById(diagramId as string);

            if (response.success && response.diagram) {
                const rfNodes = response.diagram.nodes.map((n: any) => ({
                    id: n.id,
                    type: n.type,
                    position: { x: n.x_pos, y: n.y_pos },
                    data: n.node_data_json
                }));

                const rfEdges = response.diagram.edges.map((e: any) => {
                    const sourceNode = response.diagram.nodes.find((n: any) => n.id === e.source_node);
                    const targetNode = response.diagram.nodes.find((n: any) => n.id === e.target_node);
                    const isEntityToEntity = sourceNode?.type === 'entity' && targetNode?.type === 'entity';

                    return {
                        id: e.id,
                        source: e.source_node,
                        target: e.target_node,
                        sourceHandle: e.source_handle,
                        targetHandle: e.target_handle,
                        type: isEntityToEntity ? 'relationship' : 'default',
                        data: isEntityToEntity ? {
                            sourceMaximumCardinality: e.source_cardinality,
                            targetMaximumCardinality: e.target_cardinality,
                            label: e.label
                        } : undefined
                    };
                });

                setDiagram(rfNodes, rfEdges);
                setIsHydrating(false); // 🌟 Unlock UI after data is inside Zustand!
            } else {
                alert("Failed to load diagram.");
                setIsHydrating(false);
            }
        };

        loadProject();
    }, [params.id, setDiagram]);

    const handleGenerate = async () => {
        // 1. First, check purely visual/topological rules (like disconnected tables)
        // You will update your Zustand validateDiagram to push objects: { message: "...", nodeId: id }
        const isTopologicallyValid = validateDiagram();
        if (!isTopologicallyValid) return;

        // 2. Compile the JSON Array for Zod
        const compressedData = compileDiagramState(nodes, edges);

        // 3. The Strict Zod Net
        const validationResult = databaseSchema.safeParse(compressedData);

        if (!validationResult.success) {
            // Map Zod errors into our interactive UI format
            const zodErrors: ValidationError[] = validationResult.error.issues.map((issue) => {
                // Zod 'path' looks like: [0(idx of entity), "attributes" (where problem in entity?), 1 (idx of attribute), "dataType" (where problem in attribute?)]
                // The 0th index is the index of the entity in our compressedData array!
                const entityIndex = issue.path[0] as number;
                const brokenEntity = compressedData[entityIndex];
                // Clean up the error message for the user
                const fieldName = issue.path[issue.path.length - 1] as string; // e.g., "dataType"

                const customMessage = `Table '${brokenEntity.data.label}' has an error in '${fieldName}': ${issue.message}`;

                return {
                    message: customMessage,
                    nodeId: brokenEntity.id // Pass the ID so the "Focus & Fix" button works!
                };
            });

            // Fire the bottom console!
            setGlobalErrors(zodErrors);
            return;
        }


        // generating color-coded html for sql
        // 2. Generate the SQL string -> runs on browser
        const finalSql = generateMySQL(compressedData, edges);

        // 3. Generate highlighted HTML -> runs on server
        const htmlCode = await generateSqlHtml(finalSql);

        // 4. Open the Modal
        setSqlOutput({ sql: finalSql, html: htmlCode });
    };

    // if activeExpandedEntity is not in canvas => slide out propsPanel 
    // i.e. on deleting entity using <- backspace, slide out propsPanel
    useEffect(() => {
        if (!nodes.some((n) => n.id == activeExpandedEntityId))
            setEntityExpanded(null)
    }, [nodes])

    // 🌟 2. The Loading Screen
    if (isHydrating) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                <div className="animate-spin text-4xl mb-4">🔄</div>
                <h2 className="text-xl font-bold">Loading Workspace...</h2>
            </div>
        );
    }

    return (
        // 1. Master wrapper is now a Flex Column
        <div className="w-screen h-screen flex flex-col overflow-hidden bg-gray-50">
            <EditorHeader id={params.id as string} title='test-er' nodes={nodes} edges={edges} />
            <ReactFlowProvider>

                {/* 2. TOP ROW: The Workspace (takes up all remaining space) */}
                <div className="flex-1 flex overflow-hidden">
                    <Sidebar />

                    <div className="flex-1 relative">

                        <button
                            onClick={handleGenerate}
                            className="absolute top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-md font-bold shadow-lg hover:bg-blue-700 transition"
                        >
                            Generate SQL
                        </button>
                        <DnDCanvas />

                    </div>

                    <PropertiesPanel />
                </div>

                {/* 3. BOTTOM ROW: The Resizable Console */}
                <ValidationConsole />

            </ReactFlowProvider>

            {/* Render the modal if sqlOutput has text */}
            {sqlOutput && (
                <SqlOutputModal sql={sqlOutput.sql} htmlCode={sqlOutput.html} onClose={() => setSqlOutput(null)} />
            )}
        </div>
    );
}