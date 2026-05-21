import React, { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import useDiagramStore from '@/store/useDiagramStore';

const EntityNode = ({ data, id }: any) => {
    const [label, setLabel] = useState(data.label);
    const [isEditing, setIsEditing] = useState(false);

    // Pull the specific actions from YOUR global brain
    const { activeExpandedEntityId, updateNodeData } = useDiagramStore();

    const handleLabelChange = (newLabel: string) => {
        setLabel(newLabel);
    };

    return (
        <div className="relative">
            <div
                onDoubleClick={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                className='w-40 h-12 border-2 border-black bg-white rounded-md flex items-center justify-center'
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

            {activeExpandedEntityId === id && (
                <div className="absolute top-full mt-2 w-48 bg-white border border-gray-300 rounded shadow-lg p-2 text-xs">
                    <p className="text-gray-500 mb-2 font-bold border-b pb-1">Attributes</p>
                    <div className="text-gray-400 italic">Visual limit reached. Add more here.</div>
                </div>
            )}
        </div>
    )
}

export default EntityNode