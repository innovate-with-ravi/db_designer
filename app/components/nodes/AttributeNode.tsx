import React, { useState } from 'react'
import { Handle, Position } from '@xyflow/react'

const AttributeNode = ({ data }: any) => {
  // 1. Create a local state to hold the text safely
  const [label, setLabel] = useState(data.label);
  const [isEditing, setIsEditing] = useState(false);

  let dynamicStyles = `border-2 border-black`;
  if (data.attributeType === 'key')
    dynamicStyles += ` underline decoration-solid`;
  else if (data.attributeType === 'derived')
    dynamicStyles += ` border-dashed`;
  else if (data.attributeType === 'multi-valued')
    dynamicStyles += ` outline outline-2 outline-offset-2 outline-black`;

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      onBlur={() => setIsEditing(false)}
      className={`w-28 h-16 rounded-[50%] bg-white ${dynamicStyles} flex items-center justify-center relative`}
    >
      {/* 2. Add the Handles so we can connect lines to the oval! */}
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

export default AttributeNode