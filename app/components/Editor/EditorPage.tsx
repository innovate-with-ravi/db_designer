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
import InvisibleBoxNode from '@/app/components/nodes/InvisibleBoxNode';

// import { generateSQL } from '@/lib/sqlGenerator';
// import { compileDiagramState } from '@/lib/compiler';
// import { generateSqlHtml } from '@/action/generateSqlHtml';

import ValidationConsole from '@/app/components/Editor/ValidationConsole';

// import { databaseSchema } from '@/lib/schema';
// import { ValidationError } from '@/store/useDiagramStore';
import EditorHeader from './EditorHeader';
import { getDiagramById } from '@/action/loadDiagram';
import { useParams } from 'next/navigation';
import ExportModal from './ExportModal';

// Define these OUTSIDE the component to prevent unnecessary recreation
const nodeTypes = {
    entity: EntityNode,
    attribute: AttributeNode,
    invisibleBox: InvisibleBoxNode,
};

const edgeTypes = {
    relationship: RelationshipEdge,
};

// We create an inner component to handle the canvas logic so we can use the useReactFlow hook
function DnDCanvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, takeSnapshot } = useDiagramStore();
    const { screenToFlowPosition } = useReactFlow();

    console.log("attribute[0]:", JSON.stringify(nodes.find((node) => node.type == 'attribute'), null, 2));
    console.log("edges:", JSON.stringify(edges, null, 2));

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

        // Prevent self-loops for attributes only
        if (sourceNode === targetNode && sourceNode.type != 'entity') return false;

        // a simple attribute can have only one edge
        if (sourceNode.type == 'attribute' && sourceNode.data.attributeType == 'simple') {
            if (edges.some((e) => e.source == sourceNode.id || e.target == sourceNode.id))
                return false
        }
        if (targetNode.type == 'attribute' && targetNode.data.attributeType == 'simple') {
            if (edges.some((e) => e.source == targetNode.id || e.target == targetNode.id))
                return false
        }

        // SCENARIO 1: Entity to Entity
        const isEntityToEntity = sourceNode.type === 'entity' && targetNode.type === 'entity';
        if (isEntityToEntity) return true;

        // 🌟 SCENARIO 2: Composite Attribute Logic
        if (sourceNode.type === 'attribute' && targetNode.type === 'attribute') {
            const isSourceComposite = String(sourceNode.data?.attributeType).toLowerCase() === 'composite';
            const isTargetComposite = String(targetNode.data?.attributeType).toLowerCase() === 'composite';

            // Allow if at least one is composite
            if (isSourceComposite || isTargetComposite) {
                const edgeAlreadyExists = edges.some(
                    (edge) =>
                        (edge.source === connection.source && edge.target === connection.target) ||
                        (edge.source === connection.target && edge.target === connection.source)
                );
                return !edgeAlreadyExists;
            }
            return false; // Block simple-to-simple
        }

        // SCENARIO 3: Entity to Attribute
        const isEntityToAttr =
            (sourceNode.type === 'entity' && targetNode.type === 'attribute') ||
            (sourceNode.type === 'attribute' && targetNode.type === 'entity');

        if (!isEntityToAttr) return false;

        const edgeAlreadyExists = edges.some(
            (edge) =>
                (edge.source === connection.source && edge.target === connection.target) ||
                (edge.source === connection.target && edge.target === connection.source)
        );

        if (edgeAlreadyExists) return false;

        return true; // (Keep your PK and max-attribute limits here if needed)
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

                deleteKeyCode={['Backspace', 'Delete']}
                selectionKeyCode={['Control', 'Shift']}
                proOptions={{ hideAttribution: true }}

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


export default function EditorPage({ title }: { title: string }) {
    const params = useParams();
    // const { theme, resolvedTheme } = useTheme()

    const { nodes, edges, validateDiagram, setEntityExpanded, activeExpandedEntityId, setGlobalErrors, setDiagram, exportDialect } = useDiagramStore();

    const { undo, redo, copySelection, cutSelection, pasteSelection } = useDiagramStore();

    // const [sqlOutput, setSqlOutput] = useState<{ sql: string, html: string } | null>(null);

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
                const rfNodes = response.diagram.nodes.map((n: any) => {
                    const rfData = n.node_data_json?._rf || {};
                    const { _rf, ...cleanData } = n.node_data_json;
                    return {
                        id: n.id,
                        type: n.type,
                        position: { x: n.x_pos, y: n.y_pos },
                        data: cleanData,
                        ...(rfData.parentId && { parentId: rfData.parentId }),
                        ...(rfData.extent && { extent: rfData.extent }),
                        ...(rfData.measured && { measured: rfData.measured }),
                        ...(rfData.style && { style: rfData.style })
                    };
                });

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
                            sourceMinimumCardinality: e.source_cardinality,
                            targetMinimumCardinality: e.target_cardinality,
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

    // const handleGenerate = async () => {
    //     const isTopologicallyValid = validateDiagram();
    //     if (!isTopologicallyValid) return;

    //     const compressedData = compileDiagramState(nodes, edges);
    //     const validationResult = databaseSchema.safeParse(compressedData);

    //     if (!validationResult.success) {
    //         const zodErrors: ValidationError[] = validationResult.error.issues.map((issue) => {
    //             const entityIndex = issue.path[0] as number;
    //             const brokenEntity = compressedData[entityIndex];
    //             const fieldName = issue.path[issue.path.length - 1] as string;

    //             const customMessage = `Table '${brokenEntity.data.label}' has an error in '${fieldName}': ${issue.message}`;

    //             return {
    //                 message: customMessage,
    //                 nodeId: brokenEntity.id
    //             };
    //         });

    //         setGlobalErrors(zodErrors);
    //         return;
    //     }

    //     const finalSql = generateSQL(compressedData, edges, exportDialect as any);
    //     const htmlCode = await generateSqlHtml(finalSql, resolvedTheme ?? theme);
    //     setSqlOutput({ sql: finalSql, html: htmlCode });
    // };

    useEffect(() => {
        if (!nodes.some((n) => n.id == activeExpandedEntityId))
            setEntityExpanded(null)
    }, [nodes, activeExpandedEntityId, setEntityExpanded])


    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportMode, setExportMode] = useState<'canvas' | 'ai'>('canvas');

    const handleExportClick = (mode: 'canvas' | 'ai' = 'canvas') => {
        if (mode === 'canvas' && !validateDiagram()) return;

        setExportMode(mode);
        setIsExportModalOpen(true);
    };

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
                <EditorHeader
                    id={params.id as string}
                    title={title}
                    nodes={nodes}
                    edges={edges}
                    onExportClick={() => handleExportClick('canvas')}
                    onAiExportClick={() => handleExportClick('ai')}
                />

                <ReactFlowProvider>
                    <div className="flex-1 flex overflow-hidden">
                        <Sidebar />

                        <div className="flex-1 relative bg-background transition-colors duration-300">
                            {/* 🌟 Canvas is totally clean now! No floating button. */}
                            <DnDCanvas />
                        </div>

                        <PropertiesPanel />
                    </div>
                    <ValidationConsole />
                </ReactFlowProvider>

                {/* 🌟 The Self-Contained Modal */}
                <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} mode={exportMode} />
            </div >
        </>
    );
}