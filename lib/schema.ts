import { z } from 'zod';

const SQL_RESERVED_WORDS = new Set([
    "USER", "GROUP", "ORDER", "KEY", "KEYS", "INDEX", "RANK", "SYSTEM", "FUNCTION", 
    "RANGE", "ROW", "ROWS", "VALUE", "VALUES", "CHECK", "CONDITION", "USAGE",
    "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP", "CURRENT_USER", "UTC_DATE", 
    "UTC_TIME", "UTC_TIMESTAMP", "ADD", "ALL", "ALTER", "AND", "AS", "BETWEEN", 
    "BOTH", "BY", "CALL", "CASE", "CHANGE", "CONSTRAINT", "CREATE", "CROSS", "DELETE", 
    "DESC", "DESCRIBE", "DISTINCT", "DROP", "EACH", "ELSE", "ELSEIF", "EXCEPT", 
    "EXISTS", "EXPLAIN", "FALSE", "FETCH", "FOR", "FORCE", "FOREIGN", "FROM", "FULL", 
    "GRANT", "HAVING", "IF", "IN", "INNER", "INSERT", "INTERVAL", "INTO", "IS", 
    "JOIN", "LEADING", "LEFT", "LIKE", "LIMIT", "LOCK", "LOOP", "MATCH", "NATURAL", 
    "NOT", "NULL", "ON", "OPTION", "OR", "OUT", "OUTER", "OVER", "PRIMARY", 
    "PROCEDURE", "READ", "READS", "REFERENCES", "RELEASE", "RENAME", "REPEAT", 
    "REPLACE", "REQUIRE", "RETURN", "REVOKE", "RIGHT", "SELECT", "SET", "SHOW", 
    "SIGNAL", "START", "TABLE", "THEN", "TO", "TRAILING", "TRIGGER", "TRUE", "UNION", 
    "UNIQUE", "UNLOCK", "UNSIGNED", "UPDATE", "USE", "USING", "WHEN", "WHERE", 
    "WHILE", "WINDOW", "WITH", "WRITE", "XOR"
]);

export const attributeSchema = z.preprocess(
    (attr: any) => ({
        name: attr?.name || attr?.data?.label || '',
        dataType: attr?.dataType || attr?.data?.dataType || '',
        size: attr?.size || attr?.data?.size || '',
        attributeType: String(attr?.attributeType || attr?.data?.attributeType || 'simple').toLowerCase().trim(),
        isUnique: attr?.isUnique || attr?.data?.isUnique || false,
        isNotNull: attr?.isNotNull || attr?.data?.isNotNull || false
    }),
    z.object({
        name: z.string().min(1, { message: "Column name cannot be empty" }),
        dataType: z.string().optional(),
        attributeType: z.string().optional(),
        size: z.string().optional(),
        isUnique: z.boolean().optional(),
        isNotNull: z.boolean().optional()
    }).refine((attr) => {
        if (attr.attributeType === 'composite') return true; 
        return !!attr.dataType && attr.dataType.trim().length > 0;
    }, { message: "Data type is required", path: ["dataType"] }
    ).refine((attr) => {
        if (attr.attributeType === 'composite') return true; 

        const dataType = attr.dataType?.toUpperCase?.() ?? '';
        // 🌟 THE FIX: Only demand size for specific string types
        if ((dataType === 'VARCHAR' || dataType === 'CHAR') && (!attr.size || attr.size.trim() === '')) {
            return false;
        }
        return true;
    }, { message: "VARCHAR/CHAR requires a size", path: ["size"] }
    ).refine((attr) => {
        return !SQL_RESERVED_WORDS.has(attr.name.toUpperCase());
    }, { message: `Attribute Name cannot be an SQL reserved keyword`, path: ["name"] }
    )
);

export const entitySchema = z.object({
    id: z.string(),
    data: z.object({
        label: z.string().min(1, { message: "Table name is required" }),
        primaryKey: z.string().min(1, { message: "Table is missing a Primary Key" }),
    }),
    attributes: z.array(attributeSchema).min(1, { message: "Table must have at least one attribute" }),
}).refine((entity) => {
    const colNames = new Set<string>();
    for (const attr of entity.attributes) {
        if (attr.attributeType !== 'composite') {
            if (colNames.has(attr.name)) return false;
            colNames.add(attr.name);
        }
    }
    return true;
}, {
    message: "Duplicate column names are not allowed",
    path: ["attributes"],
}).refine((entity) => {
    return !SQL_RESERVED_WORDS.has(entity.data.label.toUpperCase());
}, {
    message: `Entity Name cannot be an SQL reserved keyword`,
    path: ["data", "label"] 
});

export const databaseSchema = z.array(entitySchema);