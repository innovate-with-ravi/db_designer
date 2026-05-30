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

export interface ValidationError {
  message: string;
  nodeId: string | null; // Track exactly which node broke
}

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

  // error handling:
  globalErrors: ValidationError[];
  setGlobalErrors: (errors: ValidationError[]) => void;
  validateDiagram: () => boolean;
  activeErrorNodeId: string | null;
  setActiveErrorNodeId: (id: string | null) => void;
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

  globalErrors: [],
  setGlobalErrors: (errors) => set({ globalErrors: errors }),
  
  activeErrorNodeId: null,
  setActiveErrorNodeId: (id) => set({ activeErrorNodeId: id }),

  validateDiagram: () => {
    const { nodes, edges } = get();
    const errors: ValidationError[] = [];

    const entities = nodes.filter((n) => n.type === 'entity');

    // Regex to ensure valid SQL identifiers (Starts with letter/underscore, contains only letters/numbers/underscores)
    const isValidName = (name: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (entities.length === 0) {
      errors.push({ message: "Your canvas is empty. Add at least one Entity to generate SQL.", nodeId: null });
      set({ globalErrors: errors });
      return false;
    }

    const seenTableNames = new Set<string>();

    entities.forEach((entity) => {
      const tableName = entity.data.label || 'Unnamed_Table';

      // Feature 1: Validate Table Name format
      if (!isValidName(tableName as string)) {
        errors.push({
          message: `Table '${tableName}' has an invalid name. Use only letters, numbers, and underscores (no spaces).`,
          nodeId: entity.id
        });
      }

      // Feature 2: Prevent Duplicate Table Names
      const upperTableName = (tableName as string).toUpperCase();
      if (seenTableNames.has(upperTableName)) {
        errors.push({ message: `Duplicate table name found: '${tableName}'. Table names must be unique.`, nodeId: entity.id });
      }
      seenTableNames.add(upperTableName);

      // Primary Key Check
      if (!entity.data.primaryKey) {
        errors.push({ message: `Table '${tableName}' is missing a Primary Key.`, nodeId: entity.id });
      }

      // Gather all attributes (Hidden + Visual)
      const visualAttrs = edges
        .filter((e) => e.source === entity.id || e.target === entity.id)
        .map((e) => nodes.find((n) => n?.id === (e.source === entity.id ? e.target : e.source)))
        .filter((n) => n?.type === 'attribute')
        .map((n) => ({ name: n?.data.label, dataType: n?.data.dataType, size: n?.data.size }));

      const hiddenAttrs = entity.data.hiddenAttributes || [];
      const allAttrs = [...visualAttrs, ...hiddenAttrs as any];

      const hasRelationships = edges.some(e => e.type === 'relationship' && (e.source === entity.id || e.target === entity.id));

      if (allAttrs.length === 0) {
        errors.push({ message: `Table '${tableName}' has no attributes. Add columns before generating SQL.`, nodeId: entity.id });
      } else {
        // Validate Every Attribute
        allAttrs.forEach((attr) => {
          const attrName = attr.name || 'Unnamed_Column';

          // Feature 1: Validate Column Name format
          if (!isValidName(attrName)) {
            errors.push({ message: `Column '${attrName}' in table '${tableName}' is invalid. No spaces or special characters allowed.`, nodeId: entity.id });
          }

          // Feature 3: Check for missing Data Types and Sizes
          if (!attr.dataType || attr.dataType.trim() === '') {
            errors.push({ message: `Column '${attrName}' in table '${tableName}' is missing a Data Type.`, nodeId: entity.id });
          } else if ((attr.dataType === 'VARCHAR' || attr.dataType === 'CHAR') && (!attr.size || attr.size.trim() === '')) {
            errors.push({ message: `Column '${attrName}' in table '${tableName}' requires a Size (e.g., 255).`, nodeId: entity.id });
          }
        });
      }

      // Disconnected Table Check
      if (!hasRelationships && entities.length > 1 && allAttrs.length > 0) {
        errors.push({ message: `Warning: Table '${tableName}' is completely disconnected from the rest of the database.`, nodeId: entity.id });
      }
    });

    set({ globalErrors: errors });
    return errors.length === 0;
  },

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