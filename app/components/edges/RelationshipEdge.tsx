import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow, Position } from '@xyflow/react';
import useDiagramStore from '@/store/useDiagramStore';

const getOffsetPos = (pos: string, x: number, y: number, offset = 25) => {
    switch (pos) {
        case Position.Top: return { x, y: y - offset + 10 };
        case Position.Bottom: return { x, y: y + offset - 10 };
        case Position.Left: return { x: x - offset, y };
        case Position.Right: return { x: x + offset, y };
        default: return { x, y };
    }
};

export default function RelationshipEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data }: any) {
    const { updateEdgeData } = useDiagramStore();
    const [isEditing, setIsEditing] = useState(false);

    // 1. Add borderRadius to stop weird, crunched bends on vertical alignments
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 20
    });

    const sourceMinCard = data?.sourceMinimumCardinality || '1';
    const sourceMaxCard = data?.sourceMaximumCardinality || 'M';
    const targetMinCard = data?.targetMinimumCardinality || '1';
    const targetMaxCard = data?.targetMaximumCardinality || 'N';

    // 2. Calculate dynamic coordinates for the floating labels
    const srcLabel = getOffsetPos(sourcePosition, sourceX, sourceY);
    const tgtLabel = getOffsetPos(targetPosition, targetX, targetY);

    return (
        <>
            <BaseEdge path={edgePath} style={{ ...style, strokeWidth: 2, stroke: '#374151' }} />

            <EdgeLabelRenderer>
                {/* Source Cardinality */}
                <div
                    style={{
                        position: 'absolute',
                        // 3. Use the dynamic coordinates
                        transform: `translate(-50%, -50%) translate(${srcLabel.x}px, ${srcLabel.y}px)`,
                        pointerEvents: 'all',
                    }}
                    className="flex items-center gap-1 bg-white px-1 py-0.5 rounded shadow-sm border border-gray-300 nodrag nopan"
                >
                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800" onClick={() => updateEdgeData(id, { sourceMaximumCardinality: sourceMaxCard === '1' ? 'M' : '1' })}>
                        {sourceMaxCard}
                    </button>
                    <span className="text-[10px] text-gray-400">,</span>
                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800" onClick={() => updateEdgeData(id, { sourceMinimumCardinality: sourceMinCard === '1' ? '0' : '1' })}>
                        {sourceMinCard}
                    </button>

                </div>

                {/* The Relationship Diamond */}
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="flex items-center justify-center nodrag nopan"
                >
                    <div
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                        onBlur={() => setIsEditing(false)}
                        className="w-16 h-16 bg-blue-50 border-2 border-blue-400 rotate-45 mx-1 flex justify-center items-center shadow-sm cursor-text hover:bg-blue-100 transition-colors pointer-events-auto"
                    >
                        <div className="-rotate-45 flex items-center justify-center">
                            {!isEditing ? (
                                <p className="text-xs font-bold text-blue-900 text-center leading-tight">
                                    {data?.label || 'REL'}
                                </p>
                            ) : (
                                <input
                                    className="w-12 text-[10px] font-bold text-center outline-none bg-transparent"
                                    type="text"
                                    autoFocus
                                    value={data?.label as string || ''}
                                    onChange={(e) => updateEdgeData(id, { label: e.target.value.toUpperCase() })}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Target Cardinality */}
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${tgtLabel.x}px, ${tgtLabel.y}px)`,
                        pointerEvents: 'all',
                    }}
                    className="flex items-center gap-1 bg-white px-1 py-0.5 rounded shadow-sm border border-gray-300 nodrag nopan"
                >
                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800" onClick={() => updateEdgeData(id, { targetMinimumCardinality: targetMinCard === '1' ? '0' : '1' })}>
                        {targetMinCard}
                    </button>
                    <span className="text-[10px] text-gray-400">,</span>
                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800" onClick={() => updateEdgeData(id, { targetMaximumCardinality: targetMaxCard === '1' ? 'N' : '1' })}>
                        {targetMaxCard}
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}