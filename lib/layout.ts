import dagre from "@dagrejs/dagre"; // npm i @dagrejs/dagre
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

export const generateLayout = (jsonSchema: AgentDiagramSchema) => {
  const g = new dagre.graphlib.Graph();

  g.setGraph({ rankdir: "LR", ranksep: 100, nodesep: 50 }); // LR layout for beautiful ERDs
  g.setDefaultEdgeLabel(() => ({}));

  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  const entities = jsonSchema.entities || [];
  const relationships = jsonSchema.relationships || [];

  const pkMap = new Map<string /*entityName*/, string /*pkAttrName*/>();

  // map (entities & it's attributes) to initialNodes[]
  entities.forEach((entity: AgentEntitySchema) => {
    // Generate unique ID based on name to prevent collisions and allow edge linking
    const entityNodeId = `node-entity-${entity.name}`;

    entity.attributes.forEach((attr: AgentAttributeSchema) => {
      const attrNodeId = `node-attr-${entity.name}-${attr.name}`;

      if (attr.isPrimaryKey) {
        pkMap.set(entity.name, attrNodeId);
      }

      initialNodes.push({
        id: attrNodeId,
        type: "attribute",
        position: { x: 0, y: 0 }, // dummy position
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

      // Edge from entity to attribute
      initialEdges.push({
        id: `edge-${entityNodeId}-${attrNodeId}`,
        source: entityNodeId,
        target: attrNodeId,
        sourceHandle: "right", // LR layout
        targetHandle: "left",
        type: "default",
      });

      g.setNode(attrNodeId, {
        width: ATTRIBUTE_WIDTH,
        height: ATTRIBUTE_HEIGHT,
      });
    });

    initialNodes.push({
      id: entityNodeId,
      type: "entity",
      position: { x: 0, y: 0 },
      data: {
        label: entity.name,
        entityType: "standard",
        primaryKey: pkMap.get(entity.name) || null,
        attributeType: "simple",
      },
      measured: { width: ENTITY_WIDTH, height: ENTITY_HEIGHT },
    });

    g.setNode(entityNodeId, { width: ENTITY_WIDTH, height: ENTITY_HEIGHT });
  });

  // map relationships to initialEdges[]
  relationships.forEach((rel: AgentRelationshipSchema, index: number) => {
    const sourceEntityId = `node-entity-${rel.sourceEntity}`;
    const sourceEntity = initialNodes.find(
      (node) => node.id === sourceEntityId,
    );
    const targetEntityId = `node-entity-${rel.targetEntity}`;
    const targetEntity = initialNodes.find(
      (node) => node.id === targetEntityId,
    );

    initialEdges.push({
      id: `edge-rel-${sourceEntityId}-${targetEntityId}-${index}`, // index to ensure uniqueness if there are multiple relnpEdges b/w two entities
      source: sourceEntityId,
      target: targetEntityId,
      sourceHandle: "right",
      targetHandle: "left",
      type: "relationship",
      // fix to include min&maxCardinality (also need to fix in v-1, don't know where)
      data: {
        sourceMaximumCardinality: sourceEntity?.data.maxCardinality,
        targetMaximumCardinality: targetEntity?.data.maxCardinality,
        label: rel.label,
      },
    });
  });

  // Provide edges to Dagre
  initialEdges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  // Apply coordinates (center point of node -> top left corner)
  const layoutedNodes = initialNodes.map((node) => {
    // grab positioned node from dagre (g.node(nodeId))
    const nodeWithPosition = g.node(node.id);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.measured?.width || 0) / 2,
        y: nodeWithPosition.y - (node.measured?.height || 0) / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges: initialEdges };
};
