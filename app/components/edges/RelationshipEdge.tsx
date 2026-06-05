import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, getBezierPath, useInternalNode, Position, getStraightPath } from '@xyflow/react';
import useDiagramStore from '@/store/useDiagramStore';

// ----------------------------------------------------------------------
// 1. MATH ENGINE: Floating Edges & Intersections
// ----------------------------------------------------------------------
const getNodeCenter = (node: any) => ({
    x: node.position.x + (node.measured?.width || 160) / 2,
    y: node.position.y + (node.measured?.height || 48) / 2,
});

const getNodeIntersection = (sourceNode: any, targetNode: any) => {
    const sourceCenter = getNodeCenter(sourceNode);
    const targetCenter = getNodeCenter(targetNode);

    const w = (sourceNode.measured?.width || 160) / 2;
    const h = (sourceNode.measured?.height || 48) / 2;

    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;

    if (dx === 0 && dy === 0) return sourceCenter;

    const nx = Math.abs(dx);
    const ny = Math.abs(dy);
    let offsetX = w, offsetY = h;

    if (nx / w > ny / h) offsetY = nx !== 0 ? (ny * w) / nx : 0;
    else offsetX = ny !== 0 ? (nx * h) / ny : 0;

    return {
        x: sourceCenter.x + (dx > 0 ? offsetX : -offsetX),
        y: sourceCenter.y + (dy > 0 ? offsetY : -offsetY),
    };
};

const getOffsetPos = (pos: string, x: number, y: number, offset = 25) => {
    switch (pos) {
        case Position.Top: return { x, y: y - offset };
        case Position.Bottom: return { x, y: y + offset };
        case Position.Left: return { x: x - offset, y };
        case Position.Right: return { x: x + offset, y };
        default: return { x, y };
    }
};

// ----------------------------------------------------------------------
// 2. HELPER: Custom Unary Path Engine (Your Original Code)
// ----------------------------------------------------------------------
const getUnaryPath = (sourceX: number, sourceY: number, sourcePosition: string, targetX: number, targetY: number, targetPosition: string, isFlipped = false) => {
    const stretch = 50;
    const wrapOffset = 120;

    const isVerticalWrap = (sourcePosition === Position.Top && targetPosition === Position.Bottom) || (sourcePosition === Position.Bottom && targetPosition === Position.Top);
    const isHorizontalWrap = (sourcePosition === Position.Left && targetPosition === Position.Right) || (sourcePosition === Position.Right && targetPosition === Position.Left);

    if (isVerticalWrap) {
        const isSourceTop = sourcePosition === Position.Top;
        const topStretchY = (isSourceTop ? sourceY : targetY) - stretch;
        const bottomStretchY = (!isSourceTop ? sourceY : targetY) + stretch;
        const wrapX = sourceX + (wrapOffset * (isFlipped ? -1 : 1));
        const path = `M ${sourceX} ${sourceY} L ${sourceX} ${isSourceTop ? topStretchY : bottomStretchY} L ${wrapX} ${isSourceTop ? topStretchY : bottomStretchY} L ${wrapX} ${!isSourceTop ? topStretchY : bottomStretchY} L ${targetX} ${!isSourceTop ? topStretchY : bottomStretchY} L ${targetX} ${targetY}`;
        return [path, wrapX, (topStretchY + bottomStretchY) / 2];
    }

    if (isHorizontalWrap) {
        const isSourceLeft = sourcePosition === Position.Left;
        const leftStretchX = (isSourceLeft ? sourceX : targetX) - stretch;
        const rightStretchX = (!isSourceLeft ? sourceX : targetX) + stretch;
        const wrapY = sourceY + (wrapOffset * (isFlipped ? 1 : -1));
        const path = `M ${sourceX} ${sourceY} L ${isSourceLeft ? leftStretchX : rightStretchX} ${sourceY} L ${isSourceLeft ? leftStretchX : rightStretchX} ${wrapY} L ${!isSourceLeft ? leftStretchX : rightStretchX} ${wrapY} L ${!isSourceLeft ? leftStretchX : rightStretchX} ${targetY} L ${targetX} ${targetY}`;
        return [path, (leftStretchX + rightStretchX) / 2, wrapY];
    }

    const p1X = sourcePosition === Position.Left ? sourceX - stretch : sourcePosition === Position.Right ? sourceX + stretch : sourceX;
    const p1Y = sourcePosition === Position.Top ? sourceY - stretch : sourcePosition === Position.Bottom ? sourceY + stretch : sourceY;
    const p2X = targetPosition === Position.Left ? targetX - stretch : targetPosition === Position.Right ? targetX + stretch : targetX;
    const p2Y = targetPosition === Position.Top ? targetY - stretch : targetPosition === Position.Bottom ? targetY + stretch : targetY;

    return [`M ${sourceX} ${sourceY} L ${p1X} ${p1Y} L ${sourcePosition === Position.Left || sourcePosition === Position.Right ? p1X : p2X} ${sourcePosition === Position.Top || sourcePosition === Position.Bottom ? p1Y : p2Y} L ${p2X} ${p2Y} L ${targetX} ${targetY}`, sourcePosition === Position.Left || sourcePosition === Position.Right ? p1X : p2X, sourcePosition === Position.Top || sourcePosition === Position.Bottom ? p1Y : p2Y];
};

// ----------------------------------------------------------------------
// 3. HELPER: Interactive Cardinality Badge (Ensures Max is on Entity Side)
// ----------------------------------------------------------------------
const CardinalityBadge = ({ min, max, nodeX, nodeY, labelX, labelY, onMinClick, onMaxClick }: any) => {
    const dx = labelX - nodeX;
    const dy = labelY - nodeY;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const maxFirst = isHorizontal ? dx > 0 : dy > 0;

    const CardBtn = ({ val, onClick, title }: any) => (
        <button title={title} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 px-0.5 leading-none"
            onClick={(e) => { e.stopPropagation(); onClick(); }} >
            {val}
        </button>
    );

    const containerClasses = isHorizontal ? 'flex-row items-center' : 'flex-col items-center py-1';
    const separatorClasses = isHorizontal ? 'mx-0.5' : 'my-0.5 leading-none';

    return (
        <div className={`flex bg-white px-1 rounded shadow-sm border border-gray-300 pointer-events-auto ${containerClasses}`}>
            {maxFirst ? (
                <><CardBtn val={max} onClick={onMaxClick} title="Toggle Max" /><span className={`text-[10px] text-gray-400 ${separatorClasses}`}>,</span><CardBtn val={min} onClick={onMinClick} title="Toggle Min" /></>
            ) : (
                <><CardBtn val={min} onClick={onMinClick} title="Toggle Min" /><span className={`text-[10px] text-gray-400 ${separatorClasses}`}>,</span><CardBtn val={max} onClick={onMaxClick} title="Toggle Max" /></>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 4. MAIN EDGE COMPONENT
// ----------------------------------------------------------------------
export default function RelationshipEdge({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data }: any) {
    const { updateEdgeData, edges } = useDiagramStore();
    const [isEditing, setIsEditing] = useState(false);
    const [showFlip, setShowFlip] = useState(false);

    // Required to pull live width/height for floating geometry
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    const isUnary = source === target;
    const isFlipped = data?.isFlipped || false;

    let edgePath, labelX, labelY;
    let finalSourceX = sourceX, finalSourceY = sourceY;
    let finalTargetX = targetX, finalTargetY = targetY;
    let srcLabel = { x: 0, y: 0 }, tgtLabel = { x: 0, y: 0 };

    if (isUnary) {
        [edgePath, labelX, labelY] = getUnaryPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, isFlipped);
        srcLabel = getOffsetPos(sourcePosition, sourceX, sourceY, 30);
        tgtLabel = getOffsetPos(targetPosition, targetX, targetY, 30);
    } else {
        // ==========================================
        // THE FLOATING, CURVED, COLLISION-FREE MATH
        // ==========================================
        if (!sourceNode || !targetNode) return null;

        let startPoint = getNodeIntersection(sourceNode, targetNode);
        let endPoint = getNodeIntersection(targetNode, sourceNode);
        const sourceCenter = getNodeCenter(sourceNode);
        const targetCenter = getNodeCenter(targetNode);

        // 1. Detect Parallel Edges
        const parallelEdges = edges.filter((e: any) => (e.source === source && e.target === target) || (e.source === target && e.target === source));
        const edgeIndex = parallelEdges.findIndex((e: any) => e.id === id);
        const totalEdges = parallelEdges.length;

        // 2. Deterministic Perpendicular Shift (Stops bi-directional overlaps)
        if (totalEdges > 1) {
            const isReversed = source > target;
            const baseDx = isReversed ? sourceCenter.x - targetCenter.x : targetCenter.x - sourceCenter.x;
            const baseDy = isReversed ? sourceCenter.y - targetCenter.y : targetCenter.y - sourceCenter.y;
            const distCenter = Math.sqrt(baseDx * baseDx + baseDy * baseDy) || 1;

            // Normalized Perpendicular Vector
            const perpX = -baseDy / distCenter;
            const perpY = baseDx / distCenter;

            const offset = 60;

            // Offset by offset increments
            const offsetMagnitude = (edgeIndex - (totalEdges - 1) / 2) * offset;

            startPoint = { x: startPoint.x + perpX * offsetMagnitude, y: startPoint.y + perpY * offsetMagnitude };
            endPoint = { x: endPoint.x + perpX * offsetMagnitude, y: endPoint.y + perpY * offsetMagnitude };
        }

        finalSourceX = startPoint.x;
        finalSourceY = startPoint.y;
        finalTargetX = endPoint.x;
        finalTargetY = endPoint.y;

        // 3. Compute Bezier Control Positions
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;

        let computedSourcePos = Position.Bottom;
        let computedTargetPos = Position.Top;

        if (Math.abs(dx) > Math.abs(dy)) {
            computedSourcePos = dx > 0 ? Position.Right : Position.Left;
            computedTargetPos = dx > 0 ? Position.Left : Position.Right;
        } else {
            computedSourcePos = dy > 0 ? Position.Bottom : Position.Top;
            computedTargetPos = dy > 0 ? Position.Top : Position.Bottom;
        }

        // [edgePath, labelX, labelY] = getBezierPath({
        //     sourceX: startPoint.x, sourceY: startPoint.y, sourcePosition: computedSourcePos,
        //     targetX: endPoint.x, targetY: endPoint.y, targetPosition: computedTargetPos,
        // });

        // 3. Generate the SVG path
        [edgePath, labelX, labelY] = getStraightPath({
            sourceX: startPoint.x,
            sourceY: startPoint.y,
            targetX: endPoint.x,
            targetY: endPoint.y,
        });

        // 4. Place Cardinalities exactly 35px along the line vector!
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        srcLabel = { x: startPoint.x + (dx / dist) * 35, y: startPoint.y + (dy / dist) * 35 };
        tgtLabel = { x: endPoint.x - (dx / dist) * 35, y: endPoint.y - (dy / dist) * 35 };
    }

    const sourceMinCard = data?.sourceMinimumCardinality || '1';
    const sourceMaxCard = data?.sourceMaximumCardinality || 'M';
    const targetMinCard = data?.targetMinimumCardinality || '1';
    const targetMaxCard = data?.targetMaximumCardinality || 'N';

    const [hasFocus, setHasFocus] = useState(false)

    return (
        <>
            <BaseEdge path={edgePath as string} style={{ ...style, strokeWidth: 2, stroke: '#374151' }} />
            <EdgeLabelRenderer>
                <div
                    className={hasFocus ? "relative z-10" : "relative z-0"}
                    tabIndex={-1}
                    onFocus={() => setHasFocus(true)}
                    onBlur={() => setHasFocus(false)}
                >

                    {/* Source Cardinality Badge */}
                    <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${srcLabel.x}px, ${srcLabel.y}px)`, pointerEvents: 'all' }} className="nodrag nopan z-20" >
                        <CardinalityBadge
                            min={sourceMinCard} max={sourceMaxCard}
                            nodeX={finalSourceX} nodeY={finalSourceY} labelX={srcLabel.x} labelY={srcLabel.y}
                            onMinClick={() => updateEdgeData(id, { sourceMinimumCardinality: sourceMinCard === '1' ? '0' : '1' })}
                            onMaxClick={() => updateEdgeData(id, { sourceMaximumCardinality: sourceMaxCard === '1' ? 'M' : '1' })}
                        />
                    </div>

                    {/* The Relationship Diamond */}
                    <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
                        className="flex items-center justify-center nodrag nopan"
                        onMouseOver={() => setShowFlip(true)} onMouseOut={() => setShowFlip(false)}
                    >
                        {(isUnary && showFlip) && (
                            <button onClick={(e) => { e.stopPropagation(); updateEdgeData(id, { isFlipped: !isFlipped }); }}
                                className="absolute -top-6 text-[10px] bg-white border border-gray-300 hover:bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold shadow-sm transition-colors z-10" title="Flip Direction" >
                                ⟲ Flip
                            </button>
                        )}
                        <div onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }} onBlur={() => setIsEditing(false)}
                            className="w-16 h-16 bg-blue-50 border-2 border-blue-400 rotate-45 mx-1 flex justify-center items-center shadow-sm cursor-text hover:bg-blue-100 transition-colors pointer-events-auto rounded-2xl"
                        >
                            <div className="-rotate-45 flex items-center justify-center w-full">
                                {!isEditing ? (
                                    <p className="font-bold text-blue-900 text-center leading-tight line-clamp-1">{data?.label || 'REL'}</p>
                                ) : (
                                    <input className="w-12 text-[10px] font-bold text-center outline-none bg-transparent" type="text" autoFocus
                                        value={data?.label as string || ''}
                                        onChange={(e) => updateEdgeData(id, { label: e.target.value.toUpperCase() })}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Target Cardinality Badge */}
                    <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${tgtLabel.x}px, ${tgtLabel.y}px)`, pointerEvents: 'all' }} className="nodrag nopan z-20" >
                        <CardinalityBadge
                            min={targetMinCard} max={targetMaxCard}
                            nodeX={finalTargetX} nodeY={finalTargetY} labelX={tgtLabel.x} labelY={tgtLabel.y}
                            onMinClick={() => updateEdgeData(id, { targetMinimumCardinality: targetMinCard === '1' ? '0' : '1' })}
                            onMaxClick={() => updateEdgeData(id, { targetMaximumCardinality: targetMaxCard === '1' ? 'N' : '1' })}
                        />
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}