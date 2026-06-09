"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { ReactFlow, Background, Controls, ReactFlowProvider, useReactFlow, ConnectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';

import useDiagramStore from '@/store/useDiagramStore';
import EntityNode from '@/app/components/nodes/EntityNode';
import AttributeNode from '@/app/components/nodes/AttributeNode';
import Sidebar from '@/app/components/Editor/LeftSidebar';
import PropertiesPanel from '@/app/components/Editor/PropertiesPanel';
import RelationshipEdge from '@/app/components/edges/RelationshipEdge';

import { generateMySQL } from '@/lib/sqlGenerator';
import { compileDiagramState } from '@/lib/compiler';
import { generateSqlHtml } from '@/action/generateSqlHtml';
import SqlOutputModal from '@/app/components/Editor/SqlOutputModal';

import ValidationConsole from '@/app/components/Editor/ValidationConsole';

import { databaseSchema } from '@/lib/schema';
import { ValidationError } from '@/store/useDiagramStore';
import EditorHeader from './EditorHeader';
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
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, takeSnapshot } = useDiagramStore();
    const { screenToFlowPosition } = useReactFlow();

    // 🌟 1. Grab the global theme for React Flow!
    const { resolvedTheme } = useTheme();

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
                id: `node-${Date.now()}`,
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

    // State for showing PK exists modal 
    const [showPKModal, setShowPKModal] = React.useState(false);

    const isValidConnection = useCallback((connection: any) => {
        const { nodes, edges } = useDiagramStore.getState();

        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        if (!sourceNode || !targetNode) return false;

        if (sourceNode.type == 'attribute' && targetNode.type == 'attribute') return false;

        const isEntityToAttr =
            (sourceNode.type === 'entity' && targetNode.type === 'attribute') ||
            (sourceNode.type === 'attribute' && targetNode.type === 'entity');

        if (!isEntityToAttr) return true;

        const entityId = sourceNode.type === 'entity' ? sourceNode.id : targetNode.id;

        const draggingNode = sourceNode.id === entityId ? targetNode : sourceNode;
        const isDraggingKey = draggingNode.data?.attributeType === 'key';

        if (isDraggingKey) {
            const hasExistingKey = edges.some((edge) => {
                if (edge.source !== entityId && edge.target !== entityId) return false;
                const otherNodeId = edge.source === entityId ? edge.target : edge.source;
                const otherNode = nodes.find((n) => n.id === otherNodeId);
                return otherNode?.data?.attributeType === 'key';
            });

            if (hasExistingKey) {
                setShowPKModal(true);
                setTimeout(() => setShowPKModal(false), 2000);
                return false;
            }
        }

        let attributeLineCount = 0;

        edges.forEach((edge) => {
            if (edge.source === entityId || edge.target === entityId) {
                const otherNodeId = edge.source === entityId ? edge.target : edge.source;
                const otherNode = nodes.find((n) => n.id === otherNodeId);
                if (otherNode?.type === 'attribute') {
                    attributeLineCount++;
                }
            }
        });

        if (attributeLineCount >= 4) {
            const { setEntityExpanded } = useDiagramStore.getState();
            setEntityExpanded(entityId);
            return false;
        }

        return true;
    }, []);

    return (
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
            {/* PK Exists Modal - Now globally themed! */}
            {showPKModal && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] bg-background/80 backdrop-blur-sm pointer-events-none animate-fadeIn">
                    <div className="bg-card border border-border rounded-lg shadow-2xl p-6 max-w-sm mx-4 pointer-events-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-lg font-bold text-card-foreground">Primary Key Exists</h3>
                        </div>
                        <p className="text-muted-foreground mb-4">This entity already has a primary key attribute. Only one primary key is allowed per entity.</p>
                        <button
                            onClick={() => setShowPKModal(false)}
                            className="w-full bg-brand-blue text-white px-4 py-2 rounded hover:opacity-90 transition-all"
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
                onDrop={onDrop}

                // 🌟 THE MAGIC FIX: Take ONE snapshot the moment they grab the node
                onNodeDragStart={() => takeSnapshot()}
                onDragOver={onDragOver}
                connectionMode={ConnectionMode.Loose}
                isValidConnection={isValidConnection}
                fitView
                // 🌟 2. Magic Color Mode injection!
                colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
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

    const { undo, redo, copySelection, cutSelection, pasteSelection } = useDiagramStore();

    const [sqlOutput, setSqlOutput] = useState<{ sql: string, html: string } | null>(null);

    const [isHydrating, setIsHydrating] = useState(true);

    useEffect(() => {
        const diagramId = params.id;

        const loadProject = async () => {
            if (diagramId === 'new') {
                setDiagram([], []);
                setIsHydrating(false);
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
                setIsHydrating(false);
            } else {
                alert("Failed to load diagram.");
                setIsHydrating(false);
            }
        };

        loadProject();

    }, [params.id, setDiagram]);

    // 🌟 THE KEYBOARD LISTENER
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if user is typing inside an input field (we don't want to undo canvas if they are just typing a name!)
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

            if (cmdOrCtrl && event.key.toLowerCase() === 'z') {
                if (event.shiftKey) {
                    event.preventDefault();
                    redo(); // Cmd+Shift+Z (Mac Redo)
                } else {
                    event.preventDefault();
                    undo(); // Ctrl+Z or Cmd+Z (Undo)
                }
            } else if (cmdOrCtrl && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                redo(); // Ctrl+Y (Windows Redo)
            }
            // 🌟 NEW: Copy, Cut, Paste logic
            else if (cmdOrCtrl && event.key.toLowerCase() === 'c') {
                event.preventDefault();
                copySelection();
            } else if (cmdOrCtrl && event.key.toLowerCase() === 'x') {
                event.preventDefault();
                cutSelection();
            } else if (cmdOrCtrl && event.key.toLowerCase() === 'v') {
                event.preventDefault();
                pasteSelection();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const handleGenerate = async () => {
        const isTopologicallyValid = validateDiagram();
        if (!isTopologicallyValid) return;

        const compressedData = compileDiagramState(nodes, edges);
        const validationResult = databaseSchema.safeParse(compressedData);

        if (!validationResult.success) {
            const zodErrors: ValidationError[] = validationResult.error.issues.map((issue) => {
                const entityIndex = issue.path[0] as number;
                const brokenEntity = compressedData[entityIndex];
                const fieldName = issue.path[issue.path.length - 1] as string;

                const customMessage = `Table '${brokenEntity.data.label}' has an error in '${fieldName}': ${issue.message}`;

                return {
                    message: customMessage,
                    nodeId: brokenEntity.id
                };
            });

            setGlobalErrors(zodErrors);
            return;
        }

        const finalSql = generateMySQL(compressedData, edges);
        const htmlCode = await generateSqlHtml(finalSql);
        setSqlOutput({ sql: finalSql, html: htmlCode });
    };

    useEffect(() => {
        if (!nodes.some((n) => n.id == activeExpandedEntityId))
            setEntityExpanded(null)
    }, [nodes, activeExpandedEntityId, setEntityExpanded])

    // console.log("nodes: ", nodes);
    // console.log("edges: ", edges);

    // 🌟 Loading Screen Fix
    if (isHydrating) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-background text-muted-foreground transition-colors duration-300">
                <div className="animate-spin text-4xl mb-4">🔄</div>
                <h2 className="text-xl font-bold">Loading Workspace...</h2>
            </div>
        );
    }

    return (
        <>
            {/* 🌟 MOBILE BLOCKER OVERLAY (Globally Themed) */}
            <div className="md:hidden fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-8 text-center text-foreground transition-colors duration-300">
                <div className="w-20 h-20 bg-brand-blue/20 rounded-full flex items-center justify-center mb-6 border border-brand-blue/30">
                    <span className="text-4xl">💻</span>
                </div>
                <h2 className="text-2xl font-bold mb-3 text-foreground">Desktop Required</h2>
                <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
                    Database schema architecture requires a larger canvas for the best experience. Please open this project on a desktop or tablet device.
                </p>
                <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-brand-blue hover:opacity-90 px-8 py-3 rounded-md font-bold transition-all w-full max-w-xs shadow-lg text-white"
                >
                    Back to Dashboard
                </button>
            </div>

            {/* 🌟 MAIN EDITOR WRAPPER */}
            <div className="hidden md:flex w-screen h-screen flex-col overflow-hidden bg-background transition-colors duration-300">
                <EditorHeader id={params.id as string} title='test-er' nodes={nodes} edges={edges} />
                <ReactFlowProvider>

                    <div className="flex-1 flex overflow-hidden">
                        <Sidebar />

                        {/* 🌟 The Main Canvas Background Container */}
                        <div className="flex-1 relative bg-background transition-colors duration-300">
                            <button
                                onClick={handleGenerate}
                                className="absolute top-4 right-4 z-50 bg-brand-blue text-white px-6 py-3 rounded-md font-bold shadow-lg hover:opacity-90 transition-all"
                            >
                                Generate SQL
                            </button>
                            <DnDCanvas />
                        </div>

                        <PropertiesPanel />
                    </div>

                    <ValidationConsole />

                </ReactFlowProvider>

                {sqlOutput && (
                    <SqlOutputModal sql={sqlOutput.sql} htmlCode={sqlOutput.html} onClose={() => setSqlOutput(null)} />
                )}
            </div>
        </>
    );
}