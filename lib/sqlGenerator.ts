// lib/sqlGenerator.ts

export type SQLDialect = 'mysql' | 'oracle';

const mapDataType = (dataType: string, dialect: SQLDialect) => {
    const upperType = (dataType || 'VARCHAR').toUpperCase();
    if (dialect === 'mysql') return upperType;

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

    const rawAttr = entity.attributes.find((attr: any) =>
        attr.id === pkIdentifier ||
        attr.name === pkIdentifier ||
        attr.data?.label === pkIdentifier
    );

    if (!rawAttr) return null;

    return {
        name: rawAttr.name || rawAttr.data?.label || 'ID',
        dataType: rawAttr.dataType || rawAttr.data?.dataType || 'INT',
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
                compositePK: [fk1Name, fk2Name]
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

    const normalizedChildTables: any[] = [];

    processedEntities.forEach(entity => {
        const pk = getPKDetails(entity);
        if (!pk) return; 

        const standardAttributes: any[] = [];

        entity.attributes.forEach((attr: any) => {
            const rawType = String(attr.attributeType || attr.data?.attributeType || '').toLowerCase().replace(/[^a-z]/g, '');

            if (rawType === 'multivalued') {
                const attrName = attr.name || attr.data?.label || 'Value';
                const parentName = entity.data?.label || 'Parent';

                const childTableName = `${parentName}_${attrName}`;
                const fkName = `${parentName.toLowerCase()}_${pk.name}`;

                normalizedChildTables.push({
                    id: `child_${attr.id || Math.random()}`,
                    data: { label: childTableName, primaryKey: 'COMPOSITE' },
                    attributes: [
                        {
                            ...attr,
                            name: attrName,
                            attributeType: 'simple', 
                            data: { ...(attr.data || {}), attributeType: 'simple', label: attrName } 
                        }
                    ],
                    foreignKeys: [
                        {
                            name: fkName,
                            dataType: pk.dataType,
                            size: pk.size,
                            referencesTable: parentName,
                            referencesCol: pk.name
                        }
                    ],
                    compositePK: [fkName, attrName] 
                });
            } else {
                standardAttributes.push(attr);
            }
        });

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

        const rawType = String(rawAttr.attributeType || rawAttr.data?.attributeType || '').toLowerCase().replace(/[^a-z]/g, '');

        if (rawType === 'derived') {
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

    // 🌟 THE FIX: Strictly enforcing Oracle CONSTRAINT syntax for Composite PKs
    if (entity.compositePK && entity.compositePK.length > 0) {
        if (dialect === 'oracle') {
            // Strip special characters to ensure a valid Oracle constraint name
            const cleanName = entity.data.label.toLowerCase().replace(/[^a-z0-9_]/g, '');
            constraints.unshift(`    CONSTRAINT pk_${cleanName} PRIMARY KEY (${entity.compositePK.join(', ')})`);
        } else {
            constraints.unshift(`    PRIMARY KEY (${entity.compositePK.join(', ')})`);
        }
    }

    // Clean formatting for comments vs columns
    if (comments.length > 0) {
        tableScript += comments.join('\n') + '\n';
    }

    const allTableLines = [...columnDefinitions, ...constraints];
    tableScript += allTableLines.join(',\n');
    tableScript += `\n);\n\n`;

    return tableScript;
}