import { Node, Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  AgentAttributeSchemaBase,
  AgentDiagramSchemaBase,
  AgentEntitySchemaBase,
  AgentRelationshipSchemaBase,
} from "@/app/Agents/schemas";
import z, { size } from "zod";

type AgentDiagramSchema = z.infer<typeof AgentDiagramSchemaBase>;
type AgentEntitySchema = z.infer<typeof AgentEntitySchemaBase>;
type AgentAttributeSchema = z.infer<typeof AgentAttributeSchemaBase>;
type AgentRelationshipSchema = z.infer<typeof AgentRelationshipSchemaBase>;

const ENTITY_WIDTH = 160;
const ENTITY_HEIGHT = 48;
const ATTRIBUTE_WIDTH = 112;
const ATTRIBUTE_HEIGHT = 64;

// Helper for Phase 4: Determine angular positions for attributes based on blocked ports
/**
 *
 * @param n no. of attributes = entity.attributes.length
 * @param activePorts array of activePorts of entity
 * @returns an array of angles(in degree) where attributes needs to be placed
 */
function getAttributeAngles(n: number, activePorts: string[]): number[] {
  if (n === 0) return [];

  const blocked = {
    top: activePorts.includes("top"),
    right: activePorts.includes("right"),
    bottom: activePorts.includes("bottom"),
    left: activePorts.includes("left"),
  };
  const numBlocked = Object.values(blocked).filter(Boolean /*true*/).length;

  let zones: { start: number; arc: number }[] = [];

  if (numBlocked === 0) {
    zones = [{ start: 0, arc: 360 }];
  } else if (numBlocked === 1) {
    if (blocked.right) zones = [{ start: 90, arc: 180 }];
    else if (blocked.bottom) zones = [{ start: 180, arc: 180 }];
    else if (blocked.left) zones = [{ start: 270, arc: 180 }];
    else if (blocked.top) zones = [{ start: 0, arc: 180 }];
  } else if (numBlocked === 2) {
    if (blocked.left && blocked.right) {
      zones = [
        { start: 225, arc: 90 },
        { start: 45, arc: 90 },
      ];
    } else if (blocked.top && blocked.bottom) {
      zones = [
        { start: 135, arc: 90 },
        { start: -45, arc: 90 },
      ];
    } else if (blocked.top && blocked.right) {
      zones = [{ start: 45, arc: 180 }];
    } else if (blocked.right && blocked.bottom) {
      zones = [{ start: 135, arc: 180 }];
    } else if (blocked.bottom && blocked.left) {
      zones = [{ start: -135, arc: 180 }];
    } else if (blocked.left && blocked.top) {
      zones = [{ start: -45, arc: 180 }];
    }
  } else if (numBlocked === 3) {
    if (!blocked.left) zones = [{ start: 135, arc: 90 }];
    else if (!blocked.top) zones = [{ start: 225, arc: 90 }];
    else if (!blocked.right) zones = [{ start: -45, arc: 90 }];
    else if (!blocked.bottom) zones = [{ start: 45, arc: 90 }];
  } else {
    // 4 blocked ports
    // Centering a 30° arc on the corners (45°, 135°, 225°, 315°)
    // So start = corner - 15°
    zones = [
      { start: 30, arc: 30 }, // Centers on 45°
      { start: 120, arc: 30 }, // Centers on 135°
      { start: 210, arc: 30 }, // Centers on 225°
      { start: 300, arc: 30 }, // Centers on 315°
    ];
  }

  const angles: number[] = [];

  if (numBlocked === 0) {
    const step = 360 / n;
    for (let i = 0; i < n; i++) {
      angles.push(i * step);
    }
    return angles;
  }

  const zoneCounts = new Array(zones.length).fill(0);
  // equally distribute attrs to each zone!!!
  for (let i = 0; i < n; i++) {
    zoneCounts[i % zones.length]++;
  }

  for (let z = 0; z < zones.length; z++) {
    const zone = zones[z];
    const count = zoneCounts[z]; // no. of attrs in this zone

    if (count === 0) continue;

    if (count === 1) {
      angles.push(zone.start + zone.arc / 2); // place at exact center
    } else {
      const step = zone.arc / (count - 1);
      for (let i = 0; i < count; i++) {
        angles.push(zone.start + i * step);
      }
    }
  }

  return angles;
}

export const generateLayout = async (
  jsonSchema: AgentDiagramSchema,
): Promise<{ nodes: Node[]; edges: Edge[]; relationshipAttributes: any[] }> => {
  const initialNodes: Node[] = []; // stores all nodes()
  const initialEdges: Edge[] = [];
  const genId = Math.random().toString(36).substring(2, 9); // Global unique suffix for this layout

  const entities = jsonSchema.entities || [];
  const relationships = jsonSchema.relationships || [];

  const pkMap = new Map<string, string>(); // entityName -> primaryKeyNodeId

  // --- PHASE 1: State Initialization (The React Flow Data Layer) ---

  // 1. Iterate over schema.entities
  entities.forEach((entity: AgentEntitySchema) => {
    const parentId = `parent_${entity.name}_${genId}`;
    const entityNodeId = `entity_${entity.name}_${genId}`;

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
    entity.attributes?.forEach((attr: AgentAttributeSchema) => {
      const attrNodeId = `attr_${entity.name}_${attr.name}_${genId}`;

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
          size: attr.size || "",
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
  relationships.forEach((rel, index) => {
    const sourceId = `entity_${rel.sourceEntity}_${genId}`;
    const targetId = `entity_${rel.targetEntity}_${genId}`;

    const sourceEntity = initialNodes.find(
      (node) => node.data.label === rel.sourceEntity,
    );
    const targetEntity = initialNodes.find(
      (node) => node.data.label === rel.targetEntity,
    );

    const [sourceMax, targetMax] = (rel.maxCardinality || "1:N").split(":");
    const [sourceMin, targetMin] = (rel.minCardinality || "1:1").split(":");

    // external relationship edges
    initialEdges.push({
      id: `edge-rel-${sourceId}-${targetId}-${index}`, // -index if there are many relationshipEdges b/w src & tgt
      source: sourceId,
      target: targetId,
      type: "relationship",
      data: {
        sourceMaximumCardinality: sourceMax || "1",
        targetMaximumCardinality: targetMax || "N",
        sourceMinimumCardinality: sourceMin || "1",
        targetMinimumCardinality: targetMin || "1",
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
    id: `elk-edge-${rel.sourceEntity}-${rel.targetEntity}-${index}_${genId}`,
    sources: [`parent_${rel.sourceEntity}_${genId}`],
    targets: [`parent_${rel.targetEntity}_${genId}`],
  }));

  const elkGraph = {
    id: "root",
    // ELK configuration
    /*
  const layoutOptions = {
  'elk.algorithm': 'stress', // 'force' also works well for networks
  'elk.spacing.nodeNode': '200', 
  // If you MUST use layered, force it to spread out:
  // 'elk.algorithm': 'layered',
  // 'elk.direction': 'RIGHT', 
  // 'elk.aspectRatio': '1.5', // Forces the engine to favor a wider, screen-friendly layout
};
    */

    // for simple scenarios
    layoutOptions: {
      "elk.algorithm": "stress",
      // Forces the algorithm to keep the centers of the nodes at least 700px apart!
      // Since our boxes are 500x450, this guarantees ~200px of clean space between them.
      "elk.stress.desiredEdgeLength": "700",
      "elk.spacing.nodeNode": "150",
    },
    // layoutOptions: {
    //   "elk.algorithm": "layered",
    //   "elk.direction": "RIGHT",
    //   "elk.edgeRouting": "ORTHOGONAL",
    //   "elk.spacing.nodeNode": "150", // i can change to adjust space if needed
    //   "elk.layered.spacing.nodeNodeBetweenLayers": "200", // i can change to adjust space if needed
    // },
    children: elkNodes,
    edges: elkEdges,
  };

  // 2. Execute ELK.js
  const layoutedGraph = await elk.layout(elkGraph);

  // 3. Apply State (i.e. give new positions (x, y))
  if (layoutedGraph.children) {
    layoutedGraph.children.forEach((elkNode) => {
      const nodeIndex = initialNodes.findIndex((n) => n.id === elkNode.id);
      // const entityNodeIndex = initialNodes.findIndex(
      //   (n) => n.parentId === elkNode.id,
      // );

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
    activePorts[`entity_${entity.name}_${genId}`] = [];
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

  // --- PHASE 4: Micro-Layout (Angular Attribute Injection) ---
  const R = 180;

  entities.forEach((entity) => {
    const parentId = `parent_${entity.name}_${genId}`;

    // {{Relative center}} of the 500x450 parent box
    const cx = 250;
    const cy = 225;

    const ports = activePorts[`entity_${entity.name}_${genId}`] || [];

    // attrNode belonging to this parent
    const attrNodes = initialNodes.filter(
      (n) => n.type === "attribute" && n.parentId === parentId,
    );
    const n = attrNodes.length;

    if (n === 0) return;

    const angles = getAttributeAngles(n, ports);

    attrNodes.forEach((attrNode, index) => {
      // It's possible that there are more attributes than angles calculated (only in weird edge cases),
      // but zoneCounts guarantees angles.length === n.
      const angleDegrees = angles[index];
      const angleRadians = angleDegrees * (Math.PI / 180);

      // Calculate Attribute Center
      const x_ac = cx + R * Math.cos(angleRadians);
      const y_ac = cy + R * Math.sin(angleRadians);

      // Apply {Top-Left} Offset
      attrNode.position = {
        x: x_ac - ATTRIBUTE_WIDTH / 2,
        y: y_ac - ATTRIBUTE_HEIGHT / 2,
      };

      // --- PHASE 5: Inject Handles into Internal Edges for this attr ---
      const internalEdge = initialEdges.find(
        (e) => e.target === attrNode.id || e.source == attrNode.id,
      );

      if (internalEdge) {
        // Normalize angle to -180 to 180 for the handle logic
        let normalizedAngle = angleDegrees % 360;
        if (normalizedAngle > 180) {
          normalizedAngle -= 360;
        }

        if (normalizedAngle >= -45 && normalizedAngle <= 45) {
          // Attribute is to the Right of the entity
          internalEdge.sourceHandle = "right";
          internalEdge.targetHandle = "left";
        } else if (normalizedAngle > 45 && normalizedAngle < 135) {
          // Attribute is Below the entity
          internalEdge.sourceHandle = "bottom";
          internalEdge.targetHandle = "top";
        } else if (normalizedAngle >= 135 || normalizedAngle <= -135) {
          // Attribute is to the Left of the entity
          internalEdge.sourceHandle = "left";
          internalEdge.targetHandle = "right";
        } else if (normalizedAngle < -45 && normalizedAngle > -135) {
          // Attribute is Above the entity
          internalEdge.sourceHandle = "top";
          internalEdge.targetHandle = "bottom";
        }
      }
    });
  });

  // --- PHASE 6: Flatten to Absolute Coordinates & Remove Parent Boxes ---
  const finalNodes = initialNodes
    .map((node) => {
      if (node.parentId) {
        const parent = initialNodes.find((n) => n.id === node.parentId);
        if (parent) {
          node.position = {
            x: parent.position.x + node.position.x,
            y: parent.position.y + node.position.y,
          };
        }
        delete node.parentId;
        delete node.extent;
      }
      return node;
    })
    .filter((node) => node.type !== "invisibleBox");

  return { nodes: finalNodes, edges: initialEdges, relationshipAttributes: jsonSchema.relationshipAttributes || [] };
};
