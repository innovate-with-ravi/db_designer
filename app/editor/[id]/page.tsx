"use client";

import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState, // Replaces standard useState for nodes
  useEdgesState, // Handles the state of the lines
  addEdge,       // Helper function to connect handles
  ConnectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import EntityNode from '@/app/components/nodes/EntityNode';
import AttributeNode from '@/app/components/nodes/AttributeNode';

const nodeTypes = {
  entity: EntityNode,
  attribute: AttributeNode,
};

const initialNodes = [
  { id: '1', type: 'entity', position: { x: 250, y: 300 }, data: { label: 'STUDENT' } },
  { id: '2', type: 'attribute', position: { x: 450, y: 150 }, data: { label: 'roll_no', attributeType: 'key' } },
  { id: '3', type: 'attribute', position: { x: 250, y: 100 }, data: { label: 'name', attributeType: 'simple' } }
];

// Start with no lines drawn
const initialEdges: any[] = [];

export default function EditorPage() {
  // 1. Swap useState for React Flow's custom hooks
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 2. Create the connection handler
  // This listens for when you drag a line from a source to a target and officially saves it
  const onConnect = useCallback(
    (params/*newEdgeJSON*/: any) => setEdges((eds/*existingEdges*/) => addEdge(params, eds)),
    [setEdges],/*React's ESLint rules demand that any variable or function declared outside of a useCallback that gets used inside of it (setEdges) must be put in the dependency array [].*/
  );

  return (
    <div className="w-screen h-screen flex">
      {/* Sidebar Placeholder */}
      <div className="w-64 bg-gray-100 border-r border-gray-300 p-4">
        <h2 className="text-lg font-bold">Symbols & Tools</h2>
        <p className="text-sm text-gray-500 mt-2">Drag and drop coming soon...</p>
      </div>

      {/* The Core Canvas Area */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges} // Pass the edges state
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          onNodesChange={onNodesChange} // Fixes the dragging issue
          onEdgesChange={onEdgesChange} // Allows selecting/deleting lines
          onConnect={onConnect}         // Fixes the connecting issue
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}