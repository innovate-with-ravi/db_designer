import React, { useState } from 'react'
import { Handle, Position } from '@xyflow/react'

const EntityNode = ({ data }: any) => {
    // 1. Create a local state to hold the text safely
    const [label, setLabel] = useState(data.label);
    const [isEditing, setIsEditing] = useState(false);

    return (
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
                <p>{label}</p> // Read from local state
            ) : (
                <input
                    className='w-20 text-center outline-none bg-transparent' // Tailwind fixes for input styling
                    type='text'
                    autoFocus
                    value={label} // Bind to state
                    onChange={(e) => setLabel(e.target.value)} // 3. Update state safely
                />
            )}
        </div>
    )
}

export default EntityNode