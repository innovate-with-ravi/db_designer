import { Node, Edge } from "@xyflow/react";
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

export const generateLayout = (
  jsonSchema: AgentDiagramSchema,
): { nodes: Node[]; edges: Edge[] } => {
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

  return { nodes: initialNodes, edges: initialEdges };
};
