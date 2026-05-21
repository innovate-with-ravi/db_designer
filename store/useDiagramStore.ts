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
    set({
      edges: addEdge(connection, get().edges),
    });
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