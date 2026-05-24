import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from '@xyflow/react';
import useDiagramStore from '@/store/useDiagramStore';

export default function RelationshipEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data, }: any) {
    const { updateEdgeData } = useDiagramStore();

    // 1. Calculate the 90-degree step path and the exact center coordinates (labelX, labelY)
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Default cardinalities if none exist
    const sourceMinCard = data?.sourceMinimumCardinality || '1';
    const sourceMaxCard = data?.sourceMaximumCardinality || 'M';
    const targetMinCard = data?.targetMinimumCardinality || '1';
    const targetMaxCard = data?.targetMaximumCardinality || 'N';

    return (
        <>
            {/* 2. Render the actual SVG line */}
            <BaseEdge path={edgePath} style={{ ...style, strokeWidth: 2, stroke: '#374151' }} />

            {/* 3. Render HTML over the line using EdgeLabelRenderer */}
            <EdgeLabelRenderer>
                {/* src card */}
                <div
                    // styling that ReactFlow apply
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${sourceX + 30}px, ${sourceY}px)`,
                        pointerEvents: 'all', // Crucial: lets users click the HTML elements
                    }}
                    className="flex items-center gap-2 bg-white px-2 py-1 rounded shadow-sm border border-gray-300 nodrag nopan"
                >
                    {/* Source Cardinality Toggle */}
                    <button
                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        title='src-min-card'
                        onClick={() => updateEdgeData(id, { sourceMinimumCardinality: sourceMinCard === '1' ? '0' : '1' })}
                    >
                        {sourceMinCard}
                    </button>
                    <button
                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        title='src-max-card'
                        onClick={() => updateEdgeData(id, { sourceMaximumCardinality: sourceMaxCard === '1' ? 'M' : '1' })}
                    >
                        {sourceMaxCard}
                    </button>
                </div>

                {/* relationship*/}
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'all', // Crucial: lets users click the HTML elements
                    }}
                    className="flex items-center gap-2 px-2 py-1 rounded nodrag nopan"
                >
                    {/* The Relationship Diamond */}
                    <div className="w-20 h-20 bg-blue-100 border border-blue-500 rotate-45 mx-1 flex justify-center items-center" title="Relationship">
                        <p className='-rotate-45'>{data?.label || 'Relationship'/*relationship name*/}</p>
                    </div>
                </div>

                <div
                    // styling that ReactFlow apply
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${targetX - 30}px, ${targetY}px)`,
                        pointerEvents: 'all', // Crucial: lets users click the HTML elements
                    }}
                    className="flex items-center gap-2 bg-white px-2 py-1 rounded shadow-sm border border-gray-300 nodrag nopan"
                >
                    {/* Target Cardinality Toggle */}
                    <button
                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        title='tgt-min-card'
                        onClick={() => updateEdgeData(id, { targetMinimumCardinality: targetMinCard === '1' ? '0' : '1' })}
                    >
                        {targetMinCard}
                    </button>
                    <button
                        title='tgt-max-card'
                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        onClick={() => updateEdgeData(id, { targetMaximumCardinality: targetMaxCard === '1' ? 'N' : '1' })}
                    >
                        {targetMaxCard}
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}