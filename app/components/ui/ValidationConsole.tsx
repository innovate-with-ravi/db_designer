import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import useDiagramStore, { ValidationError } from '@/store/useDiagramStore';
import { compileDiagramState } from '@/lib/compiler';
import { databaseSchema } from '@/lib/schema';

export default function ValidationConsole() {
    const { globalErrors, setGlobalErrors, setEntityExpanded, nodes, edges, activeErrorNodeId, setActiveErrorNodeId, validateDiagram } = useDiagramStore();
    const { setCenter } = useReactFlow();

    const isOpen = globalErrors.length > 0;
    const [consoleHeight, setConsoleHeight] = useState(250);
    const isDragging = useRef(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
            setConsoleHeight(newHeight);
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
    }, [handleMouseMove]);

    const handleMouseDown = () => {
        isDragging.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'row-resize';
    };

    useEffect(() => {
        if (!isOpen) return;

        const debounceTimer = setTimeout(() => {
            const isTopologicallyValid = validateDiagram();
            if (!isTopologicallyValid) return;

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

    if (!isOpen) return null;

    return (
        <div
            className="w-full bg-destructive/5 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-destructive/20 shrink-0 relative z-100 backdrop-blur-sm transition-colors duration-300"
            style={{ height: `${consoleHeight}px` }}
        >
            <div
                className="absolute top-0 left-0 w-full h-1.5 cursor-row-resize z-10 hover:bg-destructive/80 transition-colors bg-destructive/50"
                onMouseDown={handleMouseDown}
                title="Drag to resize"
            />

            <div className="flex items-center justify-between p-2 px-6 bg-destructive/10 border-b border-destructive/20 mt-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🚨</span>
                    <h2 className="font-bold text-destructive">Compilation Errors ({globalErrors.length})</h2>
                </div>
                <button onClick={() => {
                    setGlobalErrors([])
                    setEntityExpanded(null)
                }} className="text-destructive font-bold hover:opacity-70">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {globalErrors.map((error, index) => (
                    <div key={index} className="bg-background p-3 rounded border border-destructive/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                            <span className="text-destructive font-bold">•</span>
                            <span>{error.message}</span>
                        </div>
                        {error.nodeId && (
                            <button
                                onClick={() => handleFixClick(error.nodeId)}
                                className="text-xs bg-brand-blue/10 border border-brand-blue/20 text-brand-blue px-3 py-1 rounded font-bold hover:bg-brand-blue/20 transition-colors"
                            >
                                Focus & Fix 🔍
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}