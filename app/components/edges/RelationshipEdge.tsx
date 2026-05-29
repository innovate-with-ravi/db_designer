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

const getUnaryPath = (sourceX: number, sourceY: number, sourcePosition: string, targetX: number, targetY: number, targetPosition: string, isFlipped = false) => {
    const stretch = 50;
    const wrapOffset = 120;

    const isVerticalWrap =
        (sourcePosition === Position.Top && targetPosition === Position.Bottom) ||
        (sourcePosition === Position.Bottom && targetPosition === Position.Top);

    const isHorizontalWrap =
        (sourcePosition === Position.Left && targetPosition === Position.Right) ||
        (sourcePosition === Position.Right && targetPosition === Position.Left);

    // 1. TOP-TO-BOTTOM CONNECTIONS
    if (isVerticalWrap) {
        const isSourceTop = sourcePosition === Position.Top;
        const topY = isSourceTop ? sourceY : targetY;
        const bottomY = !isSourceTop ? sourceY : targetY;

        const topStretchY = topY - stretch;
        const bottomStretchY = bottomY + stretch;

        // Direction multiplier: Default wraps Right (+), Flipped wraps Left (-)
        const directionMultiplier = isFlipped ? -1 : 1;
        const wrapX = sourceX + (wrapOffset * directionMultiplier);

        const labelX = wrapX;
        const labelY = (topStretchY + bottomStretchY) / 2;

        const path = `M ${sourceX} ${sourceY} L ${sourceX} ${isSourceTop ? topStretchY : bottomStretchY} L ${wrapX} ${isSourceTop ? topStretchY : bottomStretchY} L ${wrapX} ${!isSourceTop ? topStretchY : bottomStretchY} L ${targetX} ${!isSourceTop ? topStretchY : bottomStretchY} L ${targetX} ${targetY}`;

        return [path, labelX, labelY];
    }

    // 2. LEFT-TO-RIGHT CONNECTIONS
    if (isHorizontalWrap) {
        const isSourceLeft = sourcePosition === Position.Left;
        const leftX = isSourceLeft ? sourceX : targetX;
        const rightX = !isSourceLeft ? sourceX : targetX;

        const leftStretchX = leftX - stretch;
        const rightStretchX = rightX + stretch;

        // Direction multiplier: Default wraps Top (-), Flipped wraps Bottom (+)
        const directionMultiplier = isFlipped ? 1 : -1;
        const wrapY = sourceY + (wrapOffset * directionMultiplier);

        const labelX = (leftStretchX + rightStretchX) / 2;
        const labelY = wrapY;

        const path = `M ${sourceX} ${sourceY} L ${isSourceLeft ? leftStretchX : rightStretchX} ${sourceY} L ${isSourceLeft ? leftStretchX : rightStretchX} ${wrapY} L ${!isSourceLeft ? leftStretchX : rightStretchX} ${wrapY} L ${!isSourceLeft ? leftStretchX : rightStretchX} ${targetY} L ${targetX} ${targetY}`;

        return [path, labelX, labelY];
    }

    // 3. FALLBACK (Same Handle or Adjacent Handles)
    const p1X = sourcePosition === Position.Left ? sourceX - stretch : sourcePosition === Position.Right ? sourceX + stretch : sourceX;
    const p1Y = sourcePosition === Position.Top ? sourceY - stretch : sourcePosition === Position.Bottom ? sourceY + stretch : sourceY;

    const p2X = targetPosition === Position.Left ? targetX - stretch : targetPosition === Position.Right ? targetX + stretch : targetX;
    const p2Y = targetPosition === Position.Top ? targetY - stretch : targetPosition === Position.Bottom ? targetY + stretch : targetY;

    const labelX = sourcePosition === Position.Left || sourcePosition === Position.Right ? p1X : p2X;
    const labelY = sourcePosition === Position.Top || sourcePosition === Position.Bottom ? p1Y : p2Y;

    const path = `M ${sourceX} ${sourceY} L ${p1X} ${p1Y} L ${labelX} ${labelY} L ${p2X} ${p2Y} L ${targetX} ${targetY}`;

    return [path, labelX, labelY];
};

export default function RelationshipEdge({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data }: any) {
    const { updateEdgeData } = useDiagramStore();
    const [isEditing, setIsEditing] = useState(false);

    // 1. Detect Unary Relationship
    const isUnary = source === target;
    const isFlipped = data?.isFlipped || false; // Grab state from Zustand

    // 2. Conditionally generate the path!
    let edgePath, labelX, labelY;

    if (isUnary) {
        // Pass the isFlipped boolean into the new math engine
        [edgePath, labelX, labelY] = getUnaryPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, isFlipped);
    } else {
        [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 20 });
    }

    const sourceMinCard = data?.sourceMinimumCardinality || '1';
    const sourceMaxCard = data?.sourceMaximumCardinality || 'M';
    const targetMinCard = data?.targetMinimumCardinality || '1';
    const targetMaxCard = data?.targetMaximumCardinality || 'N';

    // 3. Push the cardinality labels slightly further out so they don't clip the new wide lines
    const offset = isUnary ? 30 : 25;
    const srcLabel = getOffsetPos(sourcePosition, sourceX, sourceY, offset);
    const tgtLabel = getOffsetPos(targetPosition, targetX, targetY, offset);

    const [showFlip, setShowFlip] = useState(false)

    return (
        <>
            <BaseEdge path={edgePath as string} style={{ ...style, strokeWidth: 2, stroke: '#374151' }} />

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
                    onMouseOver={() => setShowFlip(true)}
                    onMouseOut={() => setShowFlip(false)}
                >
                    {/* 🌟 The New Flip Button (Only shows for Unary lines) */}
                    {(isUnary && showFlip) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                updateEdgeData(id, { isFlipped: !isFlipped });
                            }}
                            className="absolute -top-6 text-[10px] bg-white border border-gray-300 hover:bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold shadow-sm transition-colors z-10"
                            title="Flip Direction"
                        >
                            ⟲ Flip
                        </button>
                    )}

                    <div
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                        onBlur={() => setIsEditing(false)}
                        className="w-16 h-16 bg-blue-50 border-2 border-blue-400 rotate-45 mx-1 flex justify-center items-center shadow-sm cursor-text hover:bg-blue-100 transition-colors pointer-events-auto"
                    >
                        <div className="-rotate-45 flex items-center justify-center w-full">
                            {!isEditing ? (
                                <p className="font-bold text-blue-900 text-center leading-tight line-clamp-1">
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

                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800" onClick={() => updateEdgeData(id, { targetMaximumCardinality: targetMaxCard === '1' ? 'N' : '1' })}>
                        {targetMaxCard}
                    </button>
                    <span className="text-[10px] text-gray-400">,</span>
                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800" onClick={() => updateEdgeData(id, { targetMinimumCardinality: targetMinCard === '1' ? '0' : '1' })}>
                        {targetMinCard}
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}