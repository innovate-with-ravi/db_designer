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

const nodeTypes = {
  entity: EntityNode,
  attribute: AttributeNode,
};

// We create an inner component to handle the canvas logic so we can use the useReactFlow hook
function DnDCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, activeExpandedEntityId, setEntityExpanded, setShowPKExists } = useDiagramStore();
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

  const isValidConnection = useCallback((connection: any) => {
    // 1. Grab the current state (only using useDiagramStore.getState()) directly from the store
    const { nodes, edges, setEntityExpanded } = useDiagramStore.getState();

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    // save from connecting entity to entity and attribute to attribute
    if (sourceNode.type == targetNode.type) return false;

    // 2. Are they connecting an Entity to an Attribute?
    const isEntityToAttr =
      (sourceNode.type === 'entity' && targetNode.type === 'attribute') ||
      (sourceNode.type === 'attribute' && targetNode.type === 'entity');

    // If it's a relationship between two entities, let it connect instantly!
    if (!isEntityToAttr) return true;

    // 3. Figure out which one is the Entity
    const entityId = sourceNode.type === 'entity' ? sourceNode.id : targetNode.id;

    // 1. Is the node they are dragging a "Key" attribute?
    const draggingNode = sourceNode.id === entityId ? targetNode : sourceNode;
    const isDraggingKey = draggingNode.data?.attributeType === 'key';

    if (isDraggingKey) {
      // 2. Check if the entity already has a Key connected
      const hasExistingKey = edges.some((edge) => {
        if (edge.source !== entityId && edge.target !== entityId) return false;

        const otherNodeId = edge.source === entityId ? edge.target : edge.source;
        const otherNode = nodes.find((n) => n.id === otherNodeId);

        return otherNode?.data?.attributeType === 'key';
      });

      // 3. Block it if a key already exists!

      if (hasExistingKey) {
        setShowPKExists(true)
        return false;
      }
    }
    // SHOW PK ALREADY EXISTS in entityNode when user tries to add new PK oval & it fails

    // 4. The Math: Count existing attribute lines
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

    //5. Replace the old trigger with this:
    if (attributeLineCount >= 4) {
      setEntityExpanded(entityId); // Set this entity as the ONE active form
      return false;
    }

    if (activeExpandedEntityId != entityId)
      setEntityExpanded(entityId)

    return true; // Allow the connection
  }, []);

  console.log("nodes: ", nodes);
  console.log("edges: ", edges);

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
      {/* We wrap the canvas in the Provider so it can access the math hooks (ReactFlowHooks) */}
      <ReactFlowProvider>
        <DnDCanvas />
      </ReactFlowProvider>

      <PropertiesPanel />
    </div>
  );
}