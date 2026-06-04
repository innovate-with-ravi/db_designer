import { Node } from '@xyflow/react';

// 1. Find the exact center of a node
function getNodeCenter(node: Node) {
    return {
        // If React Flow hasn't measured it yet, we fallback to your Tailwind w-40 (160px) and h-12 (48px)
        x: node.position.x + (node.measured?.width || 160) / 2,
        y: node.position.y + (node.measured?.height || 48) / 2,
    };
}

// 2. Calculate exactly where the line hits the border of the node
export function getNodeIntersection(sourceNode: Node, targetNode: Node) {
    const sourceCenter = getNodeCenter(sourceNode);
    const targetCenter = getNodeCenter(targetNode);

    const w = (sourceNode.measured?.width || 160) / 2;
    const h = (sourceNode.measured?.height || 48) / 2;

    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;

    if (dx === 0 && dy === 0) return sourceCenter;

    const nx = Math.abs(dx);
    const ny = Math.abs(dy);

    let offsetX = w;
    let offsetY = h;

    // Trigonometry to find if the line hits the Top/Bottom or Left/Right
    if (nx / w > ny / h) {
        offsetY = nx !== 0 ? (ny * w) / nx : 0;
    } else {
        offsetX = ny !== 0 ? (nx * h) / ny : 0;
    }

    return {
        x: sourceCenter.x + (dx > 0 ? offsetX : -offsetX),
        y: sourceCenter.y + (dy > 0 ? offsetY : -offsetY),
    };
}