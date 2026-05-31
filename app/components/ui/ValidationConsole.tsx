import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import useDiagramStore, { ValidationError } from '@/store/useDiagramStore';
import { compileDiagramState } from '@/lib/compiler';
import { databaseSchema } from '@/lib/schema';

export default function ValidationConsole() {
    const { globalErrors, setGlobalErrors, setEntityExpanded, nodes, edges, activeErrorNodeId, setActiveErrorNodeId, validateDiagram } = useDiagramStore();
    const { setCenter } = useReactFlow();

    const isOpen = globalErrors.length > 0;

    // Resizer State
    const [consoleHeight, setConsoleHeight] = useState(250);
    const isDragging = useRef(false);

    // Mouse Event Handlers for Resizing
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        // Calculate new height based on mouse Y position
        const newHeight = window.innerHeight - e.clientY;
        // Restrict height between 100px and 80% of the screen
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
            setConsoleHeight(newHeight);
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default'; // Reset cursor
    }, [handleMouseMove]);

    const handleMouseDown = () => {
        isDragging.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'row-resize'; // Show resize cursor globally while dragging
    };

    // 🌟 THE LIVE RE-VALIDATION ENGINE
    useEffect(() => {
        if (!isOpen) return;

        const debounceTimer = setTimeout(() => {
            // 🌟 2. FIX: Run Topological Validation FIRST (Just like EditorPage!)
            const isTopologicallyValid = validateDiagram();

            // If it fails, validateDiagram already updated globalErrors.
            // We return immediately so Zod doesn't overwrite the topological errors!
            if (!isTopologicallyValid) return;

            // 3. If Topology is clean, run the Zod Schema
            const compressedData = compileDiagramState(nodes, edges);
            const validationResult = databaseSchema.safeParse(compressedData);

            if (validationResult.success) {
                setGlobalErrors([]);
            } else {
                const remainingErrors: ValidationError[] = validationResult.error.issues.map((issue) => {
                    const entityIndex = issue.path[0] as number;
                    const brokenEntity = compressedData[entityIndex];
                    const fieldName = issue.path[issue.path.length - 1] as string;

                    return {
                        message: `Table '${brokenEntity.data.label}' has an error in '${fieldName}': ${issue.message}`,
                        nodeId: brokenEntity.id
                    };
                });
                setGlobalErrors(remainingErrors);
            }
        }, 500);

        return () => clearTimeout(debounceTimer);

        // Added validateDiagram to the dependency array to satisfy React hooks
    }, [nodes, edges, isOpen, setGlobalErrors, validateDiagram]);

    const handleFixClick = (nodeId: string | null) => {
        if (!nodeId) return;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        setTimeout(() => {
            setCenter(node.position.x + 40, node.position.y, { zoom: 1.2, duration: 800 });
        }, 220);
        setEntityExpanded(nodeId);
        setActiveErrorNodeId(nodeId);
        setTimeout(() => setActiveErrorNodeId(null), 3000);
    };

    // If it's closed, render nothing so it doesn't take up space in the Flex Column
    if (!isOpen) return null;

    return (
        <div
            className="w-full bg-red-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-red-200 shrink-0 relative z-100"
            style={{ height: `${consoleHeight}px` }}
        >
            {/* 🌟 The Draggable Resizer Bar */}
            <div
                className="absolute top-0 left-0 w-full h-2 cursor-row-resize z-10 hover:bg-red-400 transition-colors bg-red-500"
                onMouseDown={handleMouseDown}
                title="Drag to resize"
            />

            {/* Header */}
            <div className="flex items-center justify-between p-2 px-6 bg-red-100 border-b border-red-200 mt-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🛑</span>
                    <h2 className="font-bold text-red-900">Compilation Errors ({globalErrors.length})</h2>
                </div>
                <button onClick={() => {
                    setGlobalErrors([])
                    setEntityExpanded(null)
                }} className="text-red-500 font-bold hover:text-red-800">&times;</button>
            </div>

            {/* Error List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {globalErrors.map((error, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-red-200 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div className="flex items-center gap-2 text-sm text-gray-800">
                            <span className="text-red-500 font-bold">•</span>
                            <span>{error.message}</span>
                        </div>
                        {error.nodeId && (
                            <button
                                onClick={() => handleFixClick(error.nodeId)}
                                className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200 transition-colors"
                            >
                                Focus & Fix 🎯
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}