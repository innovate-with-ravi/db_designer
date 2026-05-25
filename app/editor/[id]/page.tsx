"use client";

import React, { useCallback, useRef } from 'react';
import { ReactFlow, Background, Controls, ReactFlowProvider, useReactFlow, ConnectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useDiagramStore from '../../../store/useDiagramStore';
import EntityNode from '@/app/components/nodes/EntityNode';
import AttributeNode from '@/app/components/nodes/AttributeNode';
import Sidebar from '@/app/components/ui/Sidebar';
import PropertiesPanel from '@/app/components/ui/PropertiesPanel';
import { transcode } from 'buffer';
import RelationshipEdge from '@/app/components/edges/RelationshipEdge';

const nodeTypes = {
  entity: EntityNode,
  attribute: AttributeNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
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
      const entityType = event.dataTransfer.getData('application/reactflow/entityType');

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
          attributeType: attributeType || 'simple',
          entityType: entityType || 'standard'
        },
      };

      // 4. Send it to Zustand!
      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  // State for showing PK exists modal (outside validation logic)
  const [showPKModal, setShowPKModal] = React.useState(false);

  const isValidConnection = useCallback((connection: any) => {
    // 1. Grab the current state (only using useDiagramStore.getState()) directly from the store
    const { nodes, edges } = useDiagramStore.getState();

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    // Prevent connecting entity to entity and attribute to attribute
    if (sourceNode.type == 'attribute' && targetNode.type == 'attribute') return false;

    // 2. Are they connecting an Entity to an Attribute?
    const isEntityToAttr =
      (sourceNode.type === 'entity' && targetNode.type === 'attribute') ||
      (sourceNode.type === 'attribute' && targetNode.type === 'entity');

    // If it's a relationship between two entities, let it connect instantly!
    if (!isEntityToAttr) return true;

    // 3. Figure out which one is the Entity
    const entityId = sourceNode.type === 'entity' ? sourceNode.id : targetNode.id;

    // Is the node they are dragging a "Key" attribute?
    const draggingNode = sourceNode.id === entityId ? targetNode : sourceNode;
    const isDraggingKey = draggingNode.data?.attributeType === 'key';

    if (isDraggingKey) {
      // Check if the entity already has a Key connected
      const hasExistingKey = edges.some((edge) => {
        if (edge.source !== entityId && edge.target !== entityId) return false;

        const otherNodeId = edge.source === entityId ? edge.target : edge.source;
        const otherNode = nodes.find((n) => n.id === otherNodeId);

        return otherNode?.data?.attributeType === 'key';
      });

      // Block it if a key already exists!
      if (hasExistingKey) {
        // Show modal via state instead of calling setShowPKExists here
        setShowPKModal(true);
        // Auto-dismiss after 2 seconds
        setTimeout(() => setShowPKModal(false), 2000);
        return false;
      }
    }

    // 4. Count existing attribute lines
    let attributeLineCount = 0;

    edges.forEach((edge) => {
      // Is this edge attached to our entity?
      if (edge.source === entityId || edge.target === entityId) {
        // Find the node on the OTHER side of this edge
        const otherNodeId = edge.source === entityId ? edge.target : edge.source;
        const otherNode = nodes.find((n) => n.id === otherNodeId);

        // If the other side is an attribute, increase the count
        if (otherNode?.type === 'attribute') {
          attributeLineCount++;
        }
      }
    });

    // If limit reached, expand the properties panel for that entity
    if (attributeLineCount >= 4) {
      const { setEntityExpanded } = useDiagramStore.getState();
      setEntityExpanded(entityId);
      return false;
    }

    return true; // Allow the connection
  }, []);

  console.log("nodes: ", nodes);
  console.log("edges: ", edges);

  return (
    <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
      {/* PK Exists Modal */}
      {showPKModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 pointer-events-none animate-fadeIn">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm mx-4 pointer-events-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-gray-800">Primary Key Exists</h3>
            </div>
            <p className="text-gray-600 mb-4">This entity already has a primary key attribute. Only one primary key is allowed per entity.</p>
            <button
              onClick={() => setShowPKModal(false)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}

        onDrop={onDrop}         // Handle the drop
        onDragOver={onDragOver} // Allow the drop
        connectionMode={ConnectionMode.Loose}
        isValidConnection={isValidConnection}
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
      {/* We wrap the canvas in the Provider so it can access the math hooks (screenToFlowPosition) */}
      <ReactFlowProvider>
        <DnDCanvas />
      </ReactFlowProvider>

      <PropertiesPanel />
    </div>
  );
}