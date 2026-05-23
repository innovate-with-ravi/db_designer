import React, { useEffect, useMemo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import useDiagramStore from '@/store/useDiagramStore';

const EntityNode = ({ data, id }: any) => {
    console.log(data);

    const [label, setLabel] = useState(data.label);
    const [isEditing, setIsEditing] = useState(false);

    // Pull the specific actions from YOUR global brain
    const { activeExpandedEntityId, updateNodeData, setEntityExpanded, nodes, edges, showPKExists, setShowPKExists } = useDiagramStore();

    useEffect(() => {
        setEntityExpanded(id)// activeEntity when it's loaded into canvas
    }, [])

    useEffect(() => {
        setTimeout(() => {
            setShowPKExists(false)
        }, 1000);
    }, [showPKExists])


    // 2. The 80/20 Lightweight Error Check (Runs only when this node updates)
    // memoize the hasError's value & re-calculate/update value only when change occurs in one of : data.hiddenAttributes, visual-attributes(nodes), 
    // i.e. don't calculate on every re-render
    const hasError = useMemo(() => {
        // Grab hidden attributes
        const hiddenAttrs = data.hiddenAttributes || [];

        // Grab visual attributes connected to this node
        const visualAttrs = edges
            .filter(e => e.source === id || e.target === id)// filter edges where source/target is this node
            .map(e => nodes.find(n => n.id === (e.source === id ? e.target : e.source)))// find other-node(s) connected by edges to this one
            .filter(n => n?.type === 'attribute')
            .map(n => n?.data || {});

        const allAttrs = [...hiddenAttrs, ...visualAttrs];// allAttrs is an array of data object of attributes  

        // fix this
        // Error Condition 1: No Primary Key found
        const PK = nodes.find(n => n.id === id)?.data?.primaryKey as string;
        console.log("PK:", PK);

        if ((!PK || PK.length == 0) && allAttrs.length > 0) return true; // Only warn if they've started adding attributes (i.e. allAttrs.length > 0)

        // Error Condition 2: Any attribute is missing a Data Type
        const hasMissingType = allAttrs.some(attr => !attr.dataType || attr.dataType === '');
        if (hasMissingType) return true;

        const hasMissingSize = allAttrs.some(attr => attr.dataType === 'VARCHAR' && attr.size === '');
        if (hasMissingSize) return true;

        return false;
    }, [data.hiddenAttributes, edges, nodes, id]); // Recalculates if connections or data changes


    // Track click timing to prevent onClick on doubleClick
    const clickTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleLabelChange = (newLabel: string) => {
        setLabel(newLabel);
    };

    const handleDoubleClick = () => {
        // Clear any pending onClick
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }
        setIsEditing(true);
    };

    const handleClick = () => {
        // Check if a doubleClick is coming
        if (clickTimerRef.current) {
            // This is the second click of a double-click, do nothing
            return;
        }

        // Set a timer - if no second click comes within 300ms, execute the onClick
        clickTimerRef.current = setTimeout(() => {
            setEntityExpanded(activeExpandedEntityId == id ? null : id);
            clickTimerRef.current = null;
        }, 300);
    };


    return (
        <div className="relative">
            <div
                onDoubleClick={handleDoubleClick}
                onBlur={() => setIsEditing(false)}
                // We add a subtle yellow border if there's an error to draw the eye
                className={`w-40 h-12 border-2 bg-white rounded-md flex items-center justify-center relative transition-colors ${hasError ? 'border-yellow-500' : 'border-black'}`}
                onClick={handleClick}
                onFocus={() => { setEntityExpanded(id) }}
            >
                {/* The Warning Badge */}
                {hasError && (
                    <div className="absolute -top-2 -right-2 bg-yellow-300 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm animate-pulse cursor-help"
                        title="Missing Data Type or Primary Key">
                        ⚠️
                    </div>
                )}

                <Handle type="source" position={Position.Top} id="top" />
                <Handle type="source" position={Position.Right} id="right" />
                <Handle type="source" position={Position.Bottom} id="bottom" />
                <Handle type="source" position={Position.Left} id="left" />

                {!isEditing ? (
                    <p className='line-clamp-1 text-center'>{label}</p>
                ) : (
                    <input
                        className='w-20 text-center outline-none bg-transparent'
                        type='text'
                        autoFocus
                        value={label}
                        onChange={(e) => handleLabelChange(e.target.value)}
                        onBlur={(e) => {
                            // The FAANG-level clean update:
                            updateNodeData(id, { label: e.target.value });
                        }}
                    />
                )}
            </div>

            {showPKExists && (
                <div className="absolute bottom-0 ">
                    PK alredy exists
                </div>
            )}

        </div>
    )
}

export default EntityNode