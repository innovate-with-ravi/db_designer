import React, { useMemo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import useDiagramStore from '@/store/useDiagramStore';

const EntityNode = ({ data, id }: any) => {

    const [label, setLabel] = useState(data.label);
    const [isEditing, setIsEditing] = useState(false);

    const { activeExpandedEntityId, updateNodeData, setEntityExpanded, activeErrorNodeId, nodes, edges } = useDiagramStore();

    const hasError = useMemo(() => {
        const hiddenAttrs = data.hiddenAttributes || [];

        const visualAttrs = edges
            .filter(e => e.source === id || e.target === id)
            .map(e => nodes.find(n => n.id === (e.source === id ? e.target : e.source)))
            .filter(n => n?.type === 'attribute')
            .map(n => n?.data || {});

        const allAttrs = [...hiddenAttrs, ...visualAttrs];

        const PK = nodes.find(n => n.id === id)?.data?.primaryKey as string;

        if ((!PK || PK.length == 0) && allAttrs.length > 0) return true;

        const hasMissingType = allAttrs.some(attr => !attr.dataType || attr.dataType === '');
        if (hasMissingType) return true;

        const hasMissingSize = allAttrs.some(attr => attr.dataType === 'VARCHAR' && (attr.size === '' || !attr.size));
        if (hasMissingSize) return true;

        return false;
    }, [data.hiddenAttributes, edges, nodes, id]);

    const clickTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleLabelChange = (newLabel: string) => {
        setLabel(newLabel);
    };

    const handleDoubleClick = () => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }
        setIsEditing(true);
    };

    const handleClick = () => {
        if (clickTimerRef.current) return;

        clickTimerRef.current = setTimeout(() => {
            setEntityExpanded(activeExpandedEntityId == id ? null : id);
            clickTimerRef.current = null;
        }, 300);
    };

    const isTargeted = activeErrorNodeId === id;

    // 🌟 Themed Dynamic Classes
    const borderStyle = data.entityType === 'weak' ? 'border-4 border-double' : 'border-2';
    const errorBorder = hasError ? 'border-amber-500' : 'border-foreground';
    const targetGlow = isTargeted ? 'ring-4 ring-destructive shadow-[0_0_25px_rgba(239,68,68,0.6)] animate-pulse' : '';

    return (
        <div className="relative group">
            <div
                onDoubleClick={handleDoubleClick}
                onBlur={() => setIsEditing(false)}
                className={`w-40 h-12 bg-card text-card-foreground rounded-md flex items-center justify-center transition-all duration-300 ${borderStyle} ${errorBorder} ${targetGlow} shadow-sm hover:shadow-md`}
                onClick={handleClick}
            >
                {/* 🌟 Themed Warning Badge */}
                {hasError && (
                    <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm animate-pulse cursor-help font-bold"
                        title="Missing Data Type or Primary Key">
                        ⚠️
                    </div>
                )}

                {/* The Ghost Handles */}
                <Handle type="source" position={Position.Top} id="top" className="w-2 h-2 border-none bg-brand-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 border-none bg-brand-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 border-none bg-brand-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="source" position={Position.Left} id="left" className="w-2 h-2 border-none bg-brand-blue opacity-0 group-hover:opacity-100 transition-opacity" />

                {!isEditing ? (
                    <p className='line-clamp-1 text-center px-2'>{label}</p>
                ) : (
                    <input
                        className='w-full px-2 text-center outline-none bg-transparent text-card-foreground'
                        type='text'
                        autoFocus
                        value={label}
                        onChange={(e) => handleLabelChange(e.target.value?.toUpperCase())}
                        onBlur={(e) => {
                            updateNodeData(id, { label: e.target.value });
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default EntityNode