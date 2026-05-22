import React, { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import useDiagramStore from '@/store/useDiagramStore';

const EntityNode = ({ data, id }: any) => {
    const [label, setLabel] = useState(data.label);
    const [isEditing, setIsEditing] = useState(false);
    const [showVisualLimit, setShowVisualLimit] = useState(false)

    // Pull the specific actions from YOUR global brain
    const { activeExpandedEntityId, updateNodeData, setEntityExpanded } = useDiagramStore();

    useEffect(() => {
        setEntityExpanded(id)// activeEntity when it's loaded into canvas
    }, [])


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
                className='w-40 h-12 border-2 border-black bg-white rounded-md flex items-center justify-center'
                onClick={handleClick}
                onFocus={() => { setEntityExpanded(id) }}
            >
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
        </div>
    )
}

export default EntityNode