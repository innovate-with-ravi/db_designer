import React, { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import useDiagramStore from '@/store/useDiagramStore';

const AttributeNode = ({ data, id }: any) => {
  const [label, setLabel] = useState(data.label);
  const [isEditing, setIsEditing] = useState(false);

  // 🌟 THE FIX: Sync Attribute labels with the time machine
    useEffect(() => {
        setLabel(data.label);
    }, [data.label]);

  const { updateNodeData } = useDiagramStore()

  // 🌟 Themed Dynamic Styles
  let dynamicStyles = `border-2 border-foreground `;
  if (data.attributeType === 'key')
    dynamicStyles += `underline decoration-solid`;
  else if (data.attributeType === 'derived')
    dynamicStyles += `border-dashed`;
  else if (data.attributeType === 'multi-valued')
    dynamicStyles += `outline outline-2 outline-offset-2 outline-foreground`;

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      onBlur={() => setIsEditing(false)}
      className={`w-28 h-16 rounded-[50%] bg-card text-card-foreground transition-colors duration-300 ${dynamicStyles} flex items-center justify-center relative shadow-sm`}
    >
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />

      {!isEditing ? (
        <p className='line-clamp-1 text-center px-2'>{label}</p>
      ) : (
        <input
          className='w-20 text-center outline-none bg-transparent text-card-foreground'
          type='text'
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={(e) => { updateNodeData(id, { label: e.target.value }) }}
        />
      )}
    </div>
  )
}

export default AttributeNode