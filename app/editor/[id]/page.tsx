"use client";

import React, { useCallback, useRef } from 'react';
import { ReactFlow, Background, Controls, ReactFlowProvider, useReactFlow, ConnectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useDiagramStore from '../../../store/useDiagramStore';
import EntityNode from '@/app/components/nodes/EntityNode';
import AttributeNode from '@/app/components/nodes/AttributeNode';
import Sidebar from '@/app/components/ui/Sidebar';

const nodeTypes = {
  entity: EntityNode,
  attribute: AttributeNode,
};

// We create an inner component to handle the canvas logic so we can use the useReactFlow hook
function DnDCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useDiagramStore();
  const { screenToFlowPosition } = useReactFlow(); // The magic coordinate math hook!

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      event.dataTransfer.dropEffect = 'move';// why & how this works
    }
    , []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // 1. Get the payload from the mouse pointer
      const type = event.dataTransfer.getData('application/reactflow/type');
      const attributeType = event.dataTransfer.getData('application/reactflow/attributeType');

      if (!type) return;

      // 2. Calculate exact canvas coordinates based on zoom and pan
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 3. Create the new node object
      const newNode = {
        id: `node-${Date.now()}`, // Generate a unique ID
        type,
        position,
        data: {
          label: type === 'entity' ? 'New Entity' : 'new_attr',
          attributeType: attributeType || 'simple'
        },
      };

      // 4. Send it to Zustand!
      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );
  console.log(edges);
  

  return (
    <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}

        onDrop={onDrop}         // Handle the drop
        onDragOver={onDragOver} // Allow the drop
        connectionMode={ConnectionMode.Loose}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

// Main page wrapper
export default function EditorPage() {
  return (
    <div className="w-screen h-screen flex overflow-hidden">
      <Sidebar />
      {/* We wrap the canvas in the Provider so it can access the math hooks (ReactFlowHooks) */}
      <ReactFlowProvider>
        <DnDCanvas />
      </ReactFlowProvider>
    </div>
  );
}