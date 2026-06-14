// lib/sqlGenerator.ts

export type SQLDialect = 'mysql' | 'oracle';

const mapDataType = (dataType: string, dialect: SQLDialect) => {
    const upperType = (dataType || 'VARCHAR').toUpperCase();
    if (dialect === 'mysql') return upperType;

    // Oracle specific type mappings
    if (dialect === 'oracle') {
        if (upperType === 'VARCHAR') return 'VARCHAR2';
        if (upperType === 'INT' || upperType === 'INTEGER') return 'NUMBER';
        if (upperType === 'DATETIME') return 'TIMESTAMP';
        if (upperType === 'TEXT') return 'CLOB';
    }
    return upperType;
};

const getPKDetails = (entity: any) => {
    const pkIdentifier = entity.data?.primaryKey;
    if (!pkIdentifier) return null;

    const rawAttr = entity.attributes.find((attr: any) => attr.id === pkIdentifier || attr.name === pkIdentifier);
    if (!rawAttr) return null;

    return {
        name: rawAttr.name || rawAttr.data?.label,
        dataType: rawAttr.dataType || rawAttr.data?.dataType,
        size: rawAttr.size || rawAttr.data?.size
    };
};

export const preProcessRelationships = (compiledEntities: any[], edges: any[]) => {
    let processedEntities = compiledEntities.map(e => ({ ...e, foreignKeys: [], compositePK: [] }));
    const relationshipEdges = edges.filter(e => e.type === 'relationship');

    relationshipEdges.forEach(edge => {
        const sourceNode = processedEntities.find(n => n.id === edge.source);
        const targetNode = processedEntities.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) return;

        const sourceMax = edge.data?.sourceMaximumCardinality || 'M';
        const targetMax = edge.data?.targetMaximumCardinality || 'N';

        const sourcePK = getPKDetails(sourceNode);
        const targetPK = getPKDetails(targetNode);

        if (!sourcePK || !targetPK) return;

        // SCENARIO 1: Many-to-Many (M:N)
        if ((sourceMax === 'M' || sourceMax === 'N') && (targetMax === 'M' || targetMax === 'N')) {
            const relName = edge.data?.label && edge.data.label !== 'REL' ? `_${edge.data.label}_` : '_';
            const junctionName = `${sourceNode.data.label}${relName}${targetNode.data.label}`;

            const fk1Name = `${sourceNode.data.label.toLowerCase()}_${sourcePK.name}`;
            const fk2Name = `${targetNode.data.label.toLowerCase()}_${targetPK.name}`;

            const junctionTable = {
                id: `junction_${edge.id}`,
                data: { label: junctionName.toUpperCase(), primaryKey: 'COMPOSITE' },
                attributes: [],
                foreignKeys: [
                    { name: fk1Name, dataType: sourcePK.dataType, size: sourcePK.size, referencesTable: sourceNode.data.label, referencesCol: sourcePK.name },
                    { name: fk2Name, dataType: targetPK.dataType, size: targetPK.size, referencesTable: targetNode.data.label, referencesCol: targetPK.name }
                ],
                compositePK: [fk1Name, fk2Name] // 🌟 Explicit Composite PK
            };
            processedEntities.push(junctionTable);
            return;
        }

        // SCENARIO 2: Unary (Self-Referencing 1:N or 1:1)
        if (edge.source === edge.target) {
            const relName = edge.data?.label && edge.data.label !== 'REL' ? edge.data.label.toLowerCase() : 'parent';
            sourceNode.foreignKeys.push({
                name: `${relName}_${sourcePK.name}`,
                dataType: sourcePK.dataType, size: sourcePK.size,
                referencesTable: sourceNode.data.label, referencesCol: sourcePK.name
            });
            return;
        }

        // SCENARIO 3: Binary 1:N, N:1, or 1:1
        let receivingNode, referencingNode, referencingPK;
        if (sourceMax === '1' && (targetMax === 'N' || targetMax === 'M')) {
            receivingNode = targetNode; referencingNode = sourceNode; referencingPK = sourcePK;
        } else if ((sourceMax === 'M' || sourceMax === 'N') && targetMax === '1') {
            receivingNode = sourceNode; referencingNode = targetNode; referencingPK = targetPK;
        } else {
            receivingNode = targetNode; referencingNode = sourceNode; referencingPK = sourcePK;
        }

        receivingNode.foreignKeys.push({
            name: `${referencingNode.data.label.toLowerCase()}_${referencingPK.name}`,
            dataType: referencingPK.dataType, size: referencingPK.size,
            referencesTable: referencingNode.data.label, referencesCol: referencingPK.name
        });
    });

    // 🌟 THE 1NF NORMALIZATION ENGINE
    const normalizedChildTables: any[] = [];

    processedEntities.forEach(entity => {
        const pk = getPKDetails(entity);
        if (!pk) return;

        const standardAttributes: any[] = [];

        entity.attributes.forEach((attr: any) => {
            if (attr.data?.attributeType === 'multivalued') {

                // 1. Rip it out of the parent table
                const attrName = attr.name || attr.data?.label || 'Value';
                const childTableName = `${entity.data.label}_${attrName}`;
                const fkName = `${entity.data.label.toLowerCase()}_${pk.name}`;

                // 2. Automatically generate the 1NF Child Table
                normalizedChildTables.push({
                    id: `child_${attr.id}`,
                    data: { label: childTableName, primaryKey: 'COMPOSITE' },
                    attributes: [
                        // The value itself becomes a standard column
                        { ...attr, name: attrName, data: { ...attr.data, attributeType: 'simple' } }
                    ],
                    foreignKeys: [
                        {
                            name: fkName,
                            dataType: pk.dataType, size: pk.size,
                            referencesTable: entity.data.label, referencesCol: pk.name
                        }
                    ],
                    compositePK: [fkName, attrName] // Primary Key is (Parent_ID, Value)
                });
            } else {
                standardAttributes.push(attr);
            }
        });

        // 3. Overwrite the parent entity to ONLY contain scalar values (1NF requirement)
        entity.attributes = standardAttributes;
    });

    return [...processedEntities, ...normalizedChildTables];
};

export const generateSQL = (compiledEntities: any[], edges: any[], dialect: SQLDialect = 'mysql') => {
    let sqlScript = `-- Generated by DB Designer\n`;
    sqlScript += `-- Dialect: ${dialect === 'oracle' ? 'Oracle SQL' : 'MySQL'}\n\n`;

    const processedEntities = preProcessRelationships(compiledEntities, edges);

    processedEntities.forEach((entity) => {
        sqlScript += buildTableSQL(entity, dialect);
    });

    return sqlScript;
};

const buildTableSQL = (entity: any, dialect: SQLDialect) => {
    let tableScript = `CREATE TABLE ${entity.data.label} (\n`;
    const comments: string[] = [];
    const columnDefinitions: string[] = [];
    const constraints: string[] = [];

    entity.attributes.forEach((rawAttr: any) => {
        const name = rawAttr.name || rawAttr.data?.label;

        // 🌟 Derived Attribute Logic: Do not generate a physical column
        if (rawAttr.data?.attributeType === 'derived') {
            comments.push(`    -- Note: '${name}' is a derived attribute and should be calculated at the application layer.`);
            return;
        }

        const rawDataType = rawAttr.dataType || rawAttr.data?.dataType;
        const mappedDataType = mapDataType(rawDataType, dialect);

        let size = rawAttr.size || rawAttr.data?.size;
        if (!size && (mappedDataType === 'VARCHAR2' || mappedDataType === 'VARCHAR')) size = '255';
        const sizeStr = size ? `(${size})` : "";

        const isPK = entity.data.primaryKey === name || entity.data.primaryKey === rawAttr.id;
        const pkStr = (isPK && entity.data.primaryKey !== 'COMPOSITE') ? " PRIMARY KEY" : "";

        columnDefinitions.push(`    ${name} ${mappedDataType}${sizeStr}${pkStr}`);
    });

    if (entity.foreignKeys && entity.foreignKeys.length > 0) {
        entity.foreignKeys.forEach((fk: any) => {
            const mappedFkType = mapDataType(fk.dataType, dialect);
            let size = fk.size;
            if (!size && (mappedFkType === 'VARCHAR2' || mappedFkType === 'VARCHAR')) size = '255';
            const sizeStr = size ? `(${size})` : "";

            columnDefinitions.push(`    ${fk.name} ${mappedFkType}${sizeStr}`);
            constraints.push(`    FOREIGN KEY (${fk.name}) REFERENCES ${fk.referencesTable}(${fk.referencesCol})`);
        });
    }

    // 🌟 Clean Composite PK Generator
    if (entity.compositePK && entity.compositePK.length > 0) {
        constraints.unshift(`    PRIMARY KEY (${entity.compositePK.join(', ')})`);
    }

    const allTableLines = [...columnDefinitions, ...constraints];
    tableScript += comments.join('\n');
    tableScript += '\n'

    tableScript += allTableLines.join(',\n');
    tableScript += `\n);\n\n`;

    return tableScript;
}