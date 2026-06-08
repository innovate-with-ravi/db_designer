import React, { useEffect, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useInternalNode, Position, getStraightPath } from '@xyflow/react';
import useDiagramStore from '@/store/useDiagramStore';

// ----------------------------------------------------------------------
// MATH ENGINE & HELPERS (Kept exactly identical)
// ----------------------------------------------------------------------
const getNodeCenter = (node: any) => ({ x: node.position.x + (node.measured?.width || 160) / 2, y: node.position.y + (node.measured?.height || 48) / 2 });

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
    return { x: sourceCenter.x + (dx > 0 ? offsetX : -offsetX), y: sourceCenter.y + (dy > 0 ? offsetY : -offsetY) };
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
// 🌟 Themed Cardinality Badge
// ----------------------------------------------------------------------
const CardinalityBadge = ({ min, max, nodeX, nodeY, labelX, labelY, onMinClick, onMaxClick }: any) => {
    const dx = labelX - nodeX;
    const dy = labelY - nodeY;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const maxFirst = isHorizontal ? dx > 0 : dy > 0;

    const CardBtn = ({ val, onClick, title }: any) => (
        <button title={title} className="text-[10px] font-bold text-brand-blue hover:opacity-80 px-0.5 leading-none transition-opacity"
            onClick={(e) => { e.stopPropagation(); onClick(); }} >
            {val}
        </button>
    );

    const containerClasses = isHorizontal ? 'flex-row items-center' : 'flex-col items-center py-1';
    const separatorClasses = isHorizontal ? 'mx-0.5' : 'my-0.5 leading-none';

    return (
        <div className={`flex bg-background px-1 rounded shadow-sm border border-border pointer-events-auto transition-colors duration-300 ${containerClasses}`}>
            {maxFirst ? (
                <><CardBtn val={max} onClick={onMaxClick} title="Toggle Max" /><span className={`text-[10px] text-muted-foreground ${separatorClasses}`}>,</span><CardBtn val={min} onClick={onMinClick} title="Toggle Min" /></>
            ) : (
                <><CardBtn val={min} onClick={onMinClick} title="Toggle Min" /><span className={`text-[10px] text-muted-foreground ${separatorClasses}`}>,</span><CardBtn val={max} onClick={onMaxClick} title="Toggle Max" /></>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// MAIN EDGE COMPONENT
// ----------------------------------------------------------------------
export default function RelationshipEdge({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data }: any) {
    const { updateEdgeData, edges } = useDiagramStore();
    const [isEditing, setIsEditing] = useState(false);
    const [showFlip, setShowFlip] = useState(false);
    const [label, setLabel] = useState(data.label)

    // 🌟 THE FIX: Sync Attribute labels with the time machine
    useEffect(() => {
        setLabel(data.label);
    }, [data.label]);

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
        if (!sourceNode || !targetNode) return null;

        let startPoint = getNodeIntersection(sourceNode, targetNode);
        let endPoint = getNodeIntersection(targetNode, sourceNode);
        const sourceCenter = getNodeCenter(sourceNode);
        const targetCenter = getNodeCenter(targetNode);

        const parallelEdges = edges.filter((e: any) => (e.source === source && e.target === target) || (e.source === target && e.target === source));
        const edgeIndex = parallelEdges.findIndex((e: any) => e.id === id);
        const totalEdges = parallelEdges.length;

        if (totalEdges > 1) {
            const isReversed = source > target;
            const baseDx = isReversed ? sourceCenter.x - targetCenter.x : targetCenter.x - sourceCenter.x;
            const baseDy = isReversed ? sourceCenter.y - targetCenter.y : targetCenter.y - sourceCenter.y;
            const distCenter = Math.sqrt(baseDx * baseDx + baseDy * baseDy) || 1;

            const perpX = -baseDy / distCenter;
            const perpY = baseDx / distCenter;
            const offset = 60;
            const offsetMagnitude = (edgeIndex - (totalEdges - 1) / 2) * offset;

            startPoint = { x: startPoint.x + perpX * offsetMagnitude, y: startPoint.y + perpY * offsetMagnitude };
            endPoint = { x: endPoint.x + perpX * offsetMagnitude, y: endPoint.y + perpY * offsetMagnitude };
        }

        finalSourceX = startPoint.x;
        finalSourceY = startPoint.y;
        finalTargetX = endPoint.x;
        finalTargetY = endPoint.y;

        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;

        [edgePath, labelX, labelY] = getStraightPath({
            sourceX: startPoint.x,
            sourceY: startPoint.y,
            targetX: endPoint.x,
            targetY: endPoint.y,
        });

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
            {/* 🌟 Themed SVG Stroke */}
            <BaseEdge
                path={edgePath as string}
                style={{ ...style, strokeWidth: 2 }}
                className="!stroke-muted-foreground transition-colors duration-300"
            />

            <EdgeLabelRenderer>
                <div
                    className={hasFocus ? "relative z-10" : "relative z-0"}
                    tabIndex={-1}
                    onFocus={() => setHasFocus(true)}
                    onBlur={() => setHasFocus(false)}
                >
                    <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${srcLabel.x}px, ${srcLabel.y}px)`, pointerEvents: 'all' }} className="nodrag nopan z-20" >
                        <CardinalityBadge
                            min={sourceMinCard} max={sourceMaxCard}
                            nodeX={finalSourceX} nodeY={finalSourceY} labelX={srcLabel.x} labelY={srcLabel.y}
                            onMinClick={() => updateEdgeData(id, { sourceMinimumCardinality: sourceMinCard === '1' ? '0' : '1' })}
                            onMaxClick={() => updateEdgeData(id, { sourceMaximumCardinality: sourceMaxCard === '1' ? 'M' : '1' })}
                        />
                    </div>

                    <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
                        className="flex items-center justify-center nodrag nopan"
                        onMouseOver={() => setShowFlip(true)} onMouseOut={() => setShowFlip(false)}
                    >
                        {/* 🌟 Themed Flip Button */}
                        {(isUnary && showFlip) && (
                            <button onClick={(e) => { e.stopPropagation(); updateEdgeData(id, { isFlipped: !isFlipped }); }}
                                className="absolute -top-6 text-[10px] bg-background border border-border hover:bg-surface px-1.5 py-0.5 rounded text-muted-foreground font-bold shadow-sm transition-colors z-10" title="Flip Direction" >
                                ⟲ Flip
                            </button>
                        )}

                        {/* 🌟 Themed Relationship Diamond */}
                        <div onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }} onBlur={() => setIsEditing(false)}
                            className="w-16 h-16 bg-brand-blue/10 border-2 border-brand-blue/50 rotate-45 mx-1 flex justify-center items-center shadow-sm cursor-text hover:bg-brand-blue/20 transition-colors pointer-events-auto rounded-2xl backdrop-blur-sm"
                        >
                            <div className="-rotate-45 flex items-center justify-center w-full">
                                {!isEditing ? (
                                    <p className="font-bold text-foreground text-center leading-tight line-clamp-1">{label || 'REL'}</p>
                                ) : (
                                    <input className="w-12 text-[10px] font-bold text-center outline-none bg-transparent text-foreground" type="text" autoFocus
                                        value={label as string || 'REL'}
                                        onChange={(e) => { setLabel(e.target.value.toLocaleUpperCase()) }}
                                        onBlur={(e) => updateEdgeData(id, { label })}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

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