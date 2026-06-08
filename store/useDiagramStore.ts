// React Flow requires a specific utility called applyNodeChanges and applyEdgeChanges to handle dragging math when using external state managers.

import { create } from 'zustand';
import {
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';

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
  updateEdgeData: (edgeId: string, newData: any) => void;

  activeExpandedEntityId: string | null;
  setEntityExpanded: (entityId: string | null) => void;

  // error handling:
  globalErrors: ValidationError[];
  setGlobalErrors: (errors: ValidationError[]) => void;
  validateDiagram: () => boolean;
  activeErrorNodeId: string | null;
  setActiveErrorNodeId: (id: string | null) => void;

  setDiagram: (nodes: any[], edges: any[]) => void;

  // History state
  past: { nodes: Node[]; edges: Edge[] }[];
  future: { nodes: Node[]; edges: Edge[] }[];
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  activeExpandedEntityId: null,
  globalErrors: [],
  activeErrorNodeId: null,

  // 🌟 1. MANUAL TIME MACHINE STATE
  past: [],
  future: [],

  takeSnapshot: () => {
    const { nodes, edges, past } = get();
    set({
      past: [...past, {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges))
      }].slice(-50),
      future: []
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: newPast,
      future: [{ nodes, edges }, ...future]
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes, edges }],
      future: newFuture
    });
  },

  // 🌟 2. STRATEGIC SNAPSHOT TRIGGERS
  setDiagram: (nodes, edges) => set({
    nodes,
    edges,
    globalErrors: [],
    activeExpandedEntityId: null,
    activeErrorNodeId: null,
    past: [],
    future: []
  }),

  setGlobalErrors: (errors) => set({ globalErrors: errors }),
  setActiveErrorNodeId: (id) => set({ activeErrorNodeId: id }),
  setEntityExpanded: (entityId: string | null) => set({ activeExpandedEntityId: entityId }),

  validateDiagram: () => {
    const { nodes, edges } = get();
    const errors: ValidationError[] = [];

    const entities = nodes.filter((n) => n.type === 'entity');

    const isValidName = (name: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (entities.length === 0) {
      errors.push({ message: "Your canvas is empty. Add at least one Entity to generate SQL.", nodeId: null });
      set({ globalErrors: errors });
      return false;
    }

    const seenTableNames = new Set<string>();

    entities.forEach((entity) => {
      const tableName = entity.data.label || 'Unnamed_Table';

      if (!isValidName(tableName as string)) {
        errors.push({
          message: `Table '${tableName}' has an invalid name. Use only letters, numbers, and underscores (no spaces).`,
          nodeId: entity.id
        });
      }

      const upperTableName = (tableName as string).toUpperCase();
      if (seenTableNames.has(upperTableName)) {
        errors.push({ message: `Duplicate table name found: '${tableName}'. Table names must be unique.`, nodeId: entity.id });
      }
      seenTableNames.add(upperTableName);

      if (!entity.data.primaryKey) {
        errors.push({ message: `Table '${tableName}' is missing a Primary Key.`, nodeId: entity.id });
      }

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
        allAttrs.forEach((attr) => {
          const attrName = attr.name || 'Unnamed_Column';

          if (!isValidName(attrName)) {
            errors.push({ message: `Column '${attrName}' in table '${tableName}' is invalid. No spaces or special characters allowed.`, nodeId: entity.id });
          }

          if (!attr.dataType || attr.dataType.trim() === '') {
            errors.push({ message: `Column '${attrName}' in table '${tableName}' is missing a Data Type.`, nodeId: entity.id });
          } else if ((attr.dataType === 'VARCHAR' || attr.dataType === 'CHAR') && (!attr.size || attr.size.trim() === '')) {
            errors.push({ message: `Column '${attrName}' in table '${tableName}' requires a Size (e.g., 255).`, nodeId: entity.id });
          }
        });
      }

      if (!hasRelationships && entities.length > 1 && allAttrs.length > 0) {
        errors.push({ message: `Warning: Table '${tableName}' is completely disconnected from the rest of the database.`, nodeId: entity.id });
      }
    });

    set({ globalErrors: errors });
    return errors.length === 0;
  },

  // 🌟 THE BULLETPROOF GUARDS
  onNodesChange: (changes) => {
    // ONLY snapshot if a node is actively being DELETED. 
    // We explicitly ignore 'position', 'select', and 'dimensions' changes here.
    const isDeletion = changes.some(c => c.type === 'remove');
    if (isDeletion) {
      get().takeSnapshot();
    }

    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    // ONLY snapshot if an edge is actively being DELETED.
    const isDeletion = changes.some(c => c.type === 'remove');
    if (isDeletion) {
      get().takeSnapshot();
    }

    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  updateNodeData: (nodeId, newData) => {
    // 🌟 SNAPSHOT BEFORE WE CHANGE THE DATA
    get().takeSnapshot();

    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      ),
    }));
  },

  updateEdgeData: (edgeId, newData) => {
    get().takeSnapshot();
    set((state) => ({ edges: state.edges.map((edge) => edge.id === edgeId ? { ...edge, data: { ...edge.data, ...newData } } : edge) }));
  },

  onConnect: (connection: Connection) => {
    get().takeSnapshot();
    const state = get();

    const sourceNode = state.nodes.find(n => n.id === connection.source);
    const targetNode = state.nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    const isEntityToEntity = sourceNode.type === 'entity' && targetNode.type === 'entity';
    const finalEdgeType = isEntityToEntity ? 'relationship' : 'default';

    const newEdge = {
      ...connection,
      id: `edge-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      type: finalEdgeType,
      data: isEntityToEntity ? { label: 'REL' } : {}
    };

    set({ edges: [...state.edges, newEdge] });

    const isSourceKey = sourceNode.data?.attributeType === 'key';
    const isTargetKey = targetNode.data?.attributeType === 'key';

    if (isSourceKey || isTargetKey) {
      const entityId = sourceNode.type === 'entity' ? sourceNode.id : targetNode.id;
      const keyNodeId = sourceNode.type === 'attribute' ? sourceNode.id : targetNode.id;
      state.updateNodeData(entityId, { primaryKey: keyNodeId });
    }
  },

  addNode: (node: Node) => {
    get().takeSnapshot();
    set({ nodes: [...get().nodes, node] });
  },
}));

export default useDiagramStore;
