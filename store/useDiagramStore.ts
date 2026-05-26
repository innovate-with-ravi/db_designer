// React Flow requires a specific utility called applyNodeChanges and applyEdgeChanges to handle dragging math when using external state managers.

import { create } from 'zustand';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import { boolean } from 'zod';

// 1. Define the TypeScript Interface for our store
interface DiagramState {
  nodes: Node[];
  edges: Edge[];

  // Actions that React Flow needs to handle physics
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Custom product actions we will use later
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, newData: any) => void;

  activeExpandedEntityId: string | null;
  setEntityExpanded: (entityId: string | null) => void;
  updateEdgeData: (edgeId: string, newData: any) => void;
}

// 2. Create the actual Zustand store 
// // this is our useDiagramStore hook that we can use in our components to get parts (nodes, edges) of the store and call actions (addNode etc.)
const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [
    // { id: '1', type: 'entity', position: { x: 250, y: 300 }, data: { label: 'STUDENT' } },
    // { id: '2', type: 'attribute', position: { x: 450, y: 150 }, data: { label: 'roll_no', attributeType: 'key' } },
    // { id: '3', type: 'attribute', position: { x: 250, y: 100 }, data: { label: 'name', attributeType: 'simple' } }
  ],
  edges: [],

  activeExpandedEntityId: null, // Starts as null

  setEntityExpanded: (entityId: string | null) => {
    set({ activeExpandedEntityId: entityId }); // Just store the one ID!
  },

  updateEdgeData: (edgeId, newData) => {
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, ...newData } } : edge
      ),
    }));
  },

  // This handles the drag-and-drop physics automatically
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  // This handles selecting and deleting lines
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  // This handles drawing new lines
  onConnect: (connection: Connection) => {
    const state = get();

    const sourceNode = state.nodes.find(n => n.id === connection.source);
    const targetNode = state.nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    // 1. Determine the Edge Type dynamically!
    // If both nodes are entities, it's a Relationship Diamond. Otherwise, it's a standard default line.
    const isEntityToEntity = sourceNode.type === 'entity' && targetNode.type === 'entity';
    const finalEdgeType = isEntityToEntity ? 'relationship' : 'default';

    // 2. Build the final edge object
    const newEdge = {
      ...connection, type: finalEdgeType, data: isEntityToEntity ? { label: 'REL' } : {}
    };

    // 3. Save it to state
    set({ edges: addEdge(newEdge, state.edges) });

    // 3. Is one of them a Key attribute?
    const isSourceKey = sourceNode.data?.attributeType === 'key';
    const isTargetKey = targetNode.data?.attributeType === 'key';

    if (isSourceKey || isTargetKey) {
      // Figure out which one is the Entity and which is the Key
      const entityId = sourceNode.type === 'entity' ? sourceNode.id : targetNode.id;
      const keyNodeId = sourceNode.type === 'attribute' ? sourceNode.id : targetNode.id;

      // 4. Fire the update exactly as you designed it!
      state.updateNodeData(entityId, { primaryKey: keyNodeId });

      // (The only edge-case here is if a user clicks the physical line and hits the "Delete" key. The entity's primaryKey string would still hold the ID of the disconnected node. For this MVP, our compiler can just double-check if the node is still attached. If you want to handle it live later, you would add similar logic to onEdgesChange!)
    }
  },

  // Custom action for our future Sidebar
  addNode: (node: Node) => {
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeData: (nodeId, newData) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      ),
    }));
  },
}));

export default useDiagramStore;