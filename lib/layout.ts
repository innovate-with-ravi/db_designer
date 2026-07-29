import { Node, Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  AgentAttributeSchemaBase,
  AgentDiagramSchemaBase,
  AgentEntitySchemaBase,
  AgentRelationshipSchemaBase,
} from "@/app/Agents/schemas";
import z from "zod";

type AgentDiagramSchema = z.infer<typeof AgentDiagramSchemaBase>;
type AgentEntitySchema = z.infer<typeof AgentEntitySchemaBase>;
type AgentAttributeSchema = z.infer<typeof AgentAttributeSchemaBase>;
type AgentRelationshipSchema = z.infer<typeof AgentRelationshipSchemaBase>;

const ENTITY_WIDTH = 160;
const ENTITY_HEIGHT = 48;
const ATTRIBUTE_WIDTH = 112;
const ATTRIBUTE_HEIGHT = 64;

export const generateLayout = async (
  jsonSchema: AgentDiagramSchema,
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  const initialNodes: Node[] = []; // stores all nodes()
  const initialEdges: Edge[] = [];

  const entities = jsonSchema.entities || [];
  const relationships = jsonSchema.relationships || [];

  const pkMap = new Map<string, string>(); // entityName -> primaryKeyNodeId

  // --- PHASE 1: State Initialization (The React Flow Data Layer) ---

  // 1. Iterate over schema.entities
  entities.forEach((entity: AgentEntitySchema) => {
    const parentId = `parent_${entity.name}`;
    const entityNodeId = `entity_${entity.name}`;

    // Create Compound Parent Node (Invisible Box)
    initialNodes.push({
      id: parentId,
      type: "invisibleBox",
      position: { x: 0, y: 0 }, // ELK.js will position this globally in Phase 2
      data: { label: `Parent-${entity.name}` },
      style: {
        width: 500,
        height: 450,
        background: "transparent",
        border: "none",
        pointerEvents: "none",
      },
    });

    // Create Core {{Entity Node}}
    initialNodes.push({
      id: entityNodeId,
      type: "entity",
      parentId: parentId,
      extent: "parent", // can't be dragged out of parentBox
      // Center of 500x450 parent is (250, 225). Entity is 160x48.
      // Top-Left: x = 250 - (160/2) = 170, y = 225 - (48/2) = 201
      position: { x: 170, y: 201 },
      data: {
        label: entity.name,
        entityType: "standard",
        primaryKey: null, // Will update below if there is one (on iterating through attributes of this entity)
        attributeType: "simple",
      },
      measured: { width: ENTITY_WIDTH, height: ENTITY_HEIGHT },
    });

    // Iterate over attributes
    entity.attributes.forEach((attr: AgentAttributeSchema) => {
      const attrNodeId = `attr_${entity.name}_${attr.name}`;

      if (attr.isPrimaryKey) {
        pkMap.set(entity.name, attrNodeId);
      }

      // Create Attribute Node
      initialNodes.push({
        id: attrNodeId,
        type: "attribute",
        parentId: parentId,
        extent: "parent",
        position: { x: 0, y: 0 }, // Phase 4 will calculate this dynamically
        data: {
          label: attr.name,
          dataType: attr.dataType,
          isNotNull: attr.isNotNull || false,
          isUnique: attr.isUnique || false,
          entityType: "standard",
          attributeType: attr.attributeType || "simple",
        },
        measured: { width: ATTRIBUTE_WIDTH, height: ATTRIBUTE_HEIGHT },
      });

      // Create {{Internal Edge}} connecting entity to attribute
      initialEdges.push({
        id: `edge-${entityNodeId}-${attrNodeId}`,
        source: entityNodeId,
        target: attrNodeId,
        type: "default",
        // sourceHandle and targetHandle will be injected dynamically in Phase 4
      });
    });

    // Update Entity Node with its Primary Key
    const entityNodeIndex = initialNodes.findIndex(
      (n) => n.id === entityNodeId,
    );
    if (entityNodeIndex !== -1 && pkMap.has(entity.name)) {
      initialNodes[entityNodeIndex].data.primaryKey = pkMap.get(entity.name);
    }
  });

  // 2. Iterate over schema.relationships
  // external relationship edges
  relationships.forEach((rel: AgentRelationshipSchema, index: number) => {
    const sourceId = `entity_${rel.sourceEntity}`;
    const sourceEntity = initialNodes.find(
      (node) => node.data.label === rel.sourceEntity,
    );
    const targetId = `entity_${rel.targetEntity}`;
    const targetEntity = initialNodes.find(
      (node) => node.data.label === rel.targetEntity,
    );

    // external relationship edges
    initialEdges.push({
      id: `edge-rel-${sourceId}-${targetId}-${index}`, // -index if there are many relationshipEdges b/w src & tgt
      source: sourceId,
      target: targetId,
      type: "relationship",
      data: {
        sourceMaximumCardinality:
          sourceEntity?.data.sourceMaximumCardinality || "1", // Fallback defaults
        targetMaximumCardinality:
          targetEntity?.data.sourceMaximumCardinality || "N",
        label: rel.label,
      },
      // sourceHandle and targetHandle will be injected in Phase 3
    });
  });

  // --- PHASE 2: Macro-Layout (Global Routing via ELK.js) ---

  const elk = new ELK();

  // 1. Filter the Nodes for ELK (only parent nodes and relationship edges)
  const elkNodes = initialNodes
    .filter((n) => n.type === "invisibleBox")
    .map((n) => ({
      id: n.id,
      width: 500,
      height: 450,
    }));

  const elkEdges = relationships.map((rel, index) => ({
    id: `elk-edge-${rel.sourceEntity}-${rel.targetEntity}-${index}`,
    sources: [`parent_${rel.sourceEntity}`],
    targets: [`parent_${rel.targetEntity}`],
  }));

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "150", // i can change to adjust space if needed
      "elk.layered.spacing.nodeNodeBetweenLayers": "200", // i can change to adjust space if needed
    },
    children: elkNodes,
    edges: elkEdges,
  };

  // 2. Execute ELK.js
  const layoutedGraph = await elk.layout(elkGraph);

  // 3. Apply State (i.e. give new positions (x, y))
  if (layoutedGraph.children) {
    layoutedGraph.children.forEach((elkNode) => {
      const nodeIndex = initialNodes.findIndex((n) => n.id === elkNode.id);

      if (nodeIndex !== -1) {
        initialNodes[nodeIndex].position = {
          x: elkNode.x || 0,
          y: elkNode.y || 0,
        };
      }
    });
  }

  // --- PHASE 3: The Floating Edge Math (Active Ports Calculation) ---

  const activePorts: Record<string, string[]> = {}; // entityId -> ["left", "right"](active ports array)

  // Initialize activePorts for all entities
  entities.forEach((entity) => {
    activePorts[`entity_${entity.name}`] = [];
  });

  initialEdges.forEach((edge) => {
    if (edge.type === "relationship") {
      const sourceEntityId = edge.source;
      const targetEntityId = edge.target;

      const sourceParentId = sourceEntityId.replace("entity_", "parent_");
      const targetParentId = targetEntityId.replace("entity_", "parent_");

      const sourceParent = initialNodes.find((n) => n.id === sourceParentId);
      const targetParent = initialNodes.find((n) => n.id === targetParentId);

      if (sourceParent && targetParent) {
        // Calculate global centers of the parent boxes
        const sourceCx = sourceParent.position.x + 250;
        const sourceCy = sourceParent.position.y + 225;
        const targetCx = targetParent.position.x + 250;
        const targetCy = targetParent.position.y + 225;

        // Trigonometric Slope
        const dx = targetCx - sourceCx;
        const dy = targetCy - sourceCy;
        const radians = Math.atan2(dy, dx);
        const degrees = radians * (180 / Math.PI);

        let sourceHandle = "";
        let targetHandle = "";

        // Assign Handles based on angle
        if (degrees >= -45 && degrees <= 45) {
          // Target is to the right
          sourceHandle = "right";
          targetHandle = "left";
        } else if (degrees > 45 && degrees < 135) {
          // Target is below
          sourceHandle = "bottom";
          targetHandle = "top";
        } else if (degrees >= 135 || degrees <= -135) {
          // Target is to the left
          sourceHandle = "left";
          targetHandle = "right";
        } else if (degrees < -45 && degrees > -135) {
          // Target is above
          sourceHandle = "top";
          targetHandle = "bottom";
        }

        edge.sourceHandle = sourceHandle;
        edge.targetHandle = targetHandle;

        // Record Active Ports
        if (!activePorts[sourceEntityId].includes(sourceHandle)) {
          activePorts[sourceEntityId].push(sourceHandle);
        }
        if (!activePorts[targetEntityId].includes(targetHandle)) {
          activePorts[targetEntityId].push(targetHandle);
        }
      }
    }
  });

  return { nodes: initialNodes, edges: initialEdges };
};
