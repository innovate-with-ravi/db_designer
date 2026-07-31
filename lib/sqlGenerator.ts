// lib/sqlGenerator.ts
import { Edge } from "@langchain/core/runnables/graph";
import { Entity, foreignKey } from "./compiler";

interface processedEntity extends Entity {
  foreignKeys: foreignKey[],
  compositePK: string[],
}

export type SQLDialect = "mysql" | "oracle";

const mapDataType = (dataType: string, dialect: SQLDialect) => {
  const upperType = (dataType || "VARCHAR").toUpperCase();
  if (dialect === "mysql") return upperType;

  if (dialect === "oracle") {
    if (upperType === "VARCHAR") return "VARCHAR2";
    if (upperType === "INT" || upperType === "INTEGER") return "NUMBER";
    if (upperType === "DATETIME") return "TIMESTAMP";
    if (upperType === "TEXT") return "CLOB";
    if (upperType === "BOOLEAN") return "NUMBER(1)"; // Standardizing boolean mapping
    if (upperType === "DECIMAL") return "NUMBER";
  }
  return upperType;
};

const getPKDetails = (entity: any) => {
  const pkIdentifier = entity.data?.primaryKey;
  if (!pkIdentifier) return null;

  const rawAttr = entity.attributes.find(
    (attr: any) =>
      attr.id === pkIdentifier ||
      attr.name === pkIdentifier ||
      attr.data?.label === pkIdentifier,
  );

  if (!rawAttr) return null;

  return {
    name: rawAttr.name || rawAttr.data?.label || "ID",
    dataType: rawAttr.dataType || rawAttr.data?.dataType || "INT",
    size: rawAttr.size || rawAttr.data?.size,
  };
};

// Kahn's Algorithm for Topological Sorting
const performTopologicalSort = (entities: any[]) => {
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const entityMap = new Map<string, any>(); // label -> entityNode

  entities.forEach((entity) => {
    const name = entity.data.label;
    adjList.set(name, []);
    inDegree.set(name, 0);
    entityMap.set(name, entity);
  });

  entities.forEach((entity) => {
    const childName = entity.data.label;
    if (entity.foreignKeys) {
      entity.foreignKeys.forEach((fk: any) => {
        const parentName = fk.referencesTable;
        if (parentName !== childName && adjList.has(parentName)) {
          adjList.get(parentName)!.push(childName);
          inDegree.set(childName, inDegree.get(childName)! + 1);
        }
      });
    }
  });

  const queue: string[] = [];
  inDegree.forEach((degree, name) => {
    if (degree === 0) queue.push(name);
  });

  const sortedNames: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sortedNames.push(current);

    const neighbors = adjList.get(current) || [];
    neighbors.forEach((neighbor) => {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    });
  }

  // 🌟 Detect the cycle and attach a flag to the array
  const hasCycle = sortedNames.length !== entities.length;
  if (hasCycle) {
    inDegree.forEach((degree, name) => {
      // add the remaining entities
      if (degree > 0) sortedNames.push(name);
    });
  }

  const sortedEntities = sortedNames.map((name) => entityMap.get(name));

  // Attach the flag directly to the array object (Backward compatible for Prisma)
  (sortedEntities as any).hasCycle = hasCycle;

  return sortedEntities;
};

/**
 *
 * @param compiledEntities
 * @param edges
 * @returns processedEntities
 *  - preProcessRelationships to give semantice names
 *  - performsTopologicalSort to ensure no cycle dependecy during foreignKeys addition exists
 *  - adds new junction entities for each M:N relationship
 *  - handles unary relationships
 *
 * @remarks
 * if cycle exists, it attaches a hasCycle = true to the returned array object of entities `processedEntities`
 */
export const preProcessRelationships = (
  compiledEntities: Entity[],
  edges: any[],
  relationshipAttributes: any[] = []
) => {
  let processedEntities: processedEntity[] = compiledEntities.map((e) => ({
    ...e,
    foreignKeys: [],
    compositePK: [],
  }));

  // edges connecting two entities
  const relationshipEdges = edges.filter((e) => e.type === "relationship");
  // a set to check & give a uniqe junctionName (during binary m:n relnp)
  const usedJunctionNames = new Set<string>();

  // process each relationship edge
  relationshipEdges.forEach((edge) => {
    const sourceNode = processedEntities.find((n) => n.id === edge.source);
    const targetNode = processedEntities.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    const sourceMax = edge.data?.sourceMaximumCardinality || "M";
    const targetMax = edge.data?.targetMaximumCardinality || "N";

    const sourcePK = getPKDetails(sourceNode);
    const targetPK = getPKDetails(targetNode);

    if (!sourcePK || !targetPK) return;

    // initial edgeLabel assigned by user
    const edgeLabel =
      edge.data?.label && edge.data.label !== "REL"
        ? String(edge.data.label)
          .trim()
          .replace(/[^a-zA-Z0-9_]/g, "")
        : "";

    // if its a binary M:N relnp -> give a unique junctionName
    if (
      (sourceMax === "M" || sourceMax === "N") &&
      (targetMax === "M" || targetMax === "N")
    ) {
      const relStr = edgeLabel ? `_${edgeLabel}_` : "_";
      let junctionName /*semantic junctionName*/ = `${sourceNode.data.label}${relStr}${targetNode.data.label}`;

      let jCounter = 1;
      while (usedJunctionNames.has(junctionName.toUpperCase())) {
        junctionName = `${sourceNode.data.label}${relStr}${targetNode.data.label}_${jCounter++}`;
      }
      usedJunctionNames.add(junctionName.toUpperCase());

      let fk1Name = `${(sourceNode.data.label as string).toLowerCase()}_${sourcePK.name}`;
      let fk2Name = `${(targetNode.data.label as string).toLowerCase()}_${targetPK.name}`;

      if (fk1Name === fk2Name) {
        fk1Name = `parent_${fk1Name}`;
        fk2Name = `child_${fk2Name}`;
      }

      // Check if there are payload attributes for this M:N relationship
      let payloadAttributes: any[] = [];
      const relAttr = relationshipAttributes.find(
        (ra) => 
          (ra.sourceEntity === sourceNode.data.label && ra.targetEntity === targetNode.data.label) ||
          (ra.sourceEntity === targetNode.data.label && ra.targetEntity === sourceNode.data.label)
      );

      if (relAttr && relAttr.attributes) {
        payloadAttributes = relAttr.attributes.map((attr: any, idx: number) => ({
          id: `attr_${junctionName}_${attr.name}_${idx}`,
          type: "attribute",
          data: {
            label: attr.name,
            dataType: attr.dataType,
            size: attr.size,
            attributeType: attr.attributeType || "simple",
            isPrimaryKey: false,
            isNotNull: attr.isNotNull,
            isUnique: attr.isUnique
          }
        }));
      }

      // a new junction entity is created
      processedEntities.push({
        id: `junction_${edge.id}`,
        data: { label: junctionName.toUpperCase(), primaryKey: "COMPOSITE" },
        attributes: payloadAttributes,
        position: { x: 0, y: 0 },// dummy (x,y) as this entity isn't shown on graph
        foreignKeys: [
          {
            name: fk1Name,
            dataType: sourcePK.dataType,
            size: sourcePK.size,
            referencesTable: (sourceNode.data.label as string),
            referencesCol: sourcePK.name,
          },
          {
            name: fk2Name,
            dataType: targetPK.dataType,
            size: targetPK.size,
            referencesTable: (targetNode.data.label as string),
            referencesCol: targetPK.name,
          },
        ],
        compositePK: [fk1Name, fk2Name],
      });
      return;
    }

    // handles unary relationships
    if (edge.source === edge.target) {
      const relName = edgeLabel ? edgeLabel.toLowerCase() : "parent";
      let fkName = `${relName}_${sourcePK.name}`;

      let counter = 1;
      while (
        sourceNode.attributes.some((a: any) => (a.name || a.data?.label) === fkName) ||
        sourceNode.foreignKeys.some((fk: any) => fk.name === fkName)
      ) {
        fkName = `${relName}_${sourcePK.name}_${counter++}`;
      }

      sourceNode.foreignKeys.push({
        name: fkName,
        dataType: sourcePK.dataType,
        size: sourcePK.size,
        referencesTable: (sourceNode.data.label as string),
        referencesCol: sourcePK.name,
      });
      return;
    }

    let receivingNode: any, referencingNode: any, referencingPK: any;
    if (sourceMax === "1" && (targetMax === "N" || targetMax === "M")) {
      receivingNode = targetNode;
      referencingNode = sourceNode;
      referencingPK = sourcePK;
    } else if ((sourceMax === "M" || sourceMax === "N") && targetMax === "1") {
      receivingNode = sourceNode;
      referencingNode = targetNode;
      referencingPK = targetPK;
    } else {
      receivingNode = targetNode;
      referencingNode = sourceNode;
      referencingPK = sourcePK;
    }

    const basePrefix = edgeLabel
      ? edgeLabel.toLowerCase()
      : referencingNode.data.label.toLowerCase();
    let fkName = `${basePrefix}_${referencingPK.name}`;

    let counter = 1;
    while (
      receivingNode.attributes.some(
        (a: any) => (a.name || a.data?.label) === fkName,
      ) ||
      receivingNode.foreignKeys.some((fk: any) => fk.name === fkName)
    ) {
      fkName = `${basePrefix}_${referencingPK.name}_${counter++}`;
    }

    receivingNode.foreignKeys.push({
      name: fkName,
      dataType: referencingPK.dataType,
      size: referencingPK.size,
      referencesTable: referencingNode.data.label,
      referencesCol: referencingPK.name,
      edgeLabel,
    });
  });

  const normalizedChildTables: any[] = [];

  processedEntities.forEach((entity) => {
    const pk = getPKDetails(entity);
    if (!pk) return;

    const standardAttributes: any[] = [];

    entity.attributes.forEach((attr: any) => {
      const rawType = String(
        attr.attributeType || attr.data?.attributeType || "",
      )
        .toLowerCase()
        .replace(/[^a-z]/g, "");

      if (rawType === "multivalued") {
        const attrName = attr.name || attr.data?.label || "Value";
        const parentName = (entity.data?.label as string) || "Parent";
        const childTableName = `${parentName}_${attrName}`;
        const fkName = `${parentName.toLowerCase()}_${pk.name}`;

        normalizedChildTables.push({
          id: `child_${attr.id || Math.random()}`,
          data: { label: childTableName, primaryKey: "COMPOSITE" },
          attributes: [
            {
              ...attr,
              name: attrName,
              attributeType: "simple",
              data: {
                ...(attr.data || {}),
                attributeType: "simple",
                label: attrName,
              },
            },
          ],
          foreignKeys: [
            {
              name: fkName,
              dataType: pk.dataType,
              size: pk.size,
              referencesTable: parentName,
              referencesCol: pk.name,
            },
          ],
          compositePK: [fkName, attrName],
        });
      } else {
        standardAttributes.push(attr);
      }
    });

    entity.attributes = standardAttributes;
  });

  const allEntities = [...processedEntities, ...normalizedChildTables];

  // 🌟 Pass the entire payload through the Topo-Sorter before it hits SQL or Prisma generators!
  return performTopologicalSort(allEntities);
};

/**
 *
 * @param entity
 * @param dialect the sql dialect: mysql, oracle, prisma
 * @param skipForeignKeys set it to true, if circular dependecy is detected to add all ForeignKeys later using ALTER command
 * @returns sql script for a single table/entitye
 */
const buildTableSQL = (
  entity: any,
  dialect: SQLDialect,
  skipForeignKeys: boolean = false,
) => {
  let tableScript = `CREATE TABLE ${entity.data.label} (\n`;
  const comments: string[] = [];
  const columnDefinitions: string[] = [];
  const constraints: string[] = [];

  entity.attributes.forEach((rawAttr: any) => {
    const name = rawAttr.name || rawAttr.data?.label;
    const rawType = String(
      rawAttr.attributeType || rawAttr.data?.attributeType || "",
    )
      .toLowerCase()
      .replace(/[^a-z]/g, "");

    if (rawType === "derived") {
      comments.push(
        `    -- Note: '${name}' is a derived attribute and should be calculated at the application layer.`,
      );
      return;
    }

    const rawDataType = rawAttr.dataType || rawAttr.data?.dataType;
    const mappedDataType = mapDataType(rawDataType, dialect);

    let size = rawAttr.size || rawAttr.data?.size;
    // add logic to skip size if mapDataType isn't VARCHAR or CHAR
    if (
      mappedDataType != "VARCHAR2" &&
      mappedDataType != "VARCHAR" &&
      mappedDataType != "CHAR"
    )
      size = "";
    else if (!size) size = "255";

    const sizeStr = size ? `(${size})` : "";
    const isPK =
      entity.data.primaryKey === name || entity.data.primaryKey === rawAttr.id;
    const pkStr =
      isPK && entity.data.primaryKey !== "COMPOSITE" ? " PRIMARY KEY" : "";
    const isNotNull =
      (rawAttr.isNotNull || rawAttr.data?.isNotNull) && !isPK
        ? " NOT NULL"
        : "";
    const isUnique =
      (rawAttr.isUnique || rawAttr.data?.isUnique) && !isPK ? " UNIQUE" : "";

    columnDefinitions.push(
      `    ${name} ${mappedDataType}${sizeStr}${isNotNull}${isUnique}${pkStr}`,
    );
  });

  if (entity.foreignKeys && entity.foreignKeys.length > 0) {
    entity.foreignKeys.forEach((fk: any) => {
      const mappedFkType = mapDataType(fk.dataType, dialect);
      let size = fk.size;
      if (!size && (mappedFkType === "VARCHAR2" || mappedFkType === "VARCHAR"))
        size = "255";
      const sizeStr = size ? `(${size})` : "";

      // 🌟 ALWAYS generate the column
      columnDefinitions.push(`    ${fk.name} ${mappedFkType}${sizeStr}`);

      // 🌟 ONLY add the constraint if we aren't skipping them
      if (!skipForeignKeys) {
        constraints.push(
          `    FOREIGN KEY (${fk.name}) REFERENCES ${fk.referencesTable}(${fk.referencesCol})`,
        );
      }
    });
  }

  if (entity.compositePK && entity.compositePK.length > 0) {
    if (dialect === "oracle") {
      const cleanName = entity.data.label
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
      constraints.unshift(
        `    CONSTRAINT pk_${cleanName} PRIMARY KEY (${entity.compositePK.join(", ")})`,
      );
    } else {
      constraints.unshift(`    PRIMARY KEY (${entity.compositePK.join(", ")})`);
    }
  }

  if (comments.length > 0) tableScript += comments.join("\n") + "\n";
  let body = columnDefinitions.join(",\n");

  if (constraints.length > 0) {
    body += ",\n\n    -- Constraints\n" + constraints.join(",\n");
  }

  tableScript += body + "\n);\n\n";
  return tableScript;
};

/**
 *
 * @param compiledEntities
 * @param edges
 * @param dialect
 * @returns
 */
export const generateSQL = (
  compiledEntities: any[],
  edges: Edge[],
  dialect: SQLDialect = "mysql",
  relationshipAttributes: any[] = []
) => {
  let sqlScript = `-- Generated by DB Designer\n`;
  sqlScript += `-- Dialect: ${dialect === "oracle" ? "Oracle SQL" : "MySQL"}\n\n`;

  const processedEntities = preProcessRelationships(compiledEntities, edges, relationshipAttributes);

  // 🌟 Read the hidden flag attached by the topo-sorter to the processedEntities array's object
  const hasCycle = (processedEntities as any).hasCycle;

  if (hasCycle) {
    sqlScript += `-- ⚠️ CIRCULAR DEPENDENCY DETECTED ⚠️\n`;
    sqlScript += `-- Using 2-Pass Generation: Tables created first, Foreign Keys altered afterwards.\n\n`;

    // PASS 1: Create all tables (Columns only, no Foreign Key Constraints)
    processedEntities.forEach((entity) => {
      sqlScript += buildTableSQL(entity, dialect, true);
    });

    // PASS 2: Append all ALTER TABLE statements
    sqlScript += `-- ----------------------------------------------------------------------\n`;
    sqlScript += `-- FOREIGN KEY CONSTRAINTS (ALTER TABLES)\n`;
    sqlScript += `-- ----------------------------------------------------------------------\n\n`;

    processedEntities.forEach((entity: any) => {
      if (entity.foreignKeys && entity.foreignKeys.length > 0) {
        entity.foreignKeys.forEach((fk: any) => {
          sqlScript += `ALTER TABLE ${entity.data.label}\n`;
          sqlScript += `    ADD FOREIGN KEY (${fk.name}) REFERENCES ${fk.referencesTable}(${fk.referencesCol});\n\n`;
        });
      }
    });
  } else {
    // NO CYCLE: Generate perfectly clean, ordered code in a single pass
    processedEntities.forEach((entity) => {
      sqlScript += buildTableSQL(entity, dialect, false);
    });
  }

  return sqlScript;
};
