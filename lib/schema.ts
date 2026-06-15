import { z } from 'zod';

const SQL_RESERVED_WORDS = new Set([
    // --- Common Nouns (The most frequent offenders) ---
    "USER",       // #1 Collision: "SELECT * FROM user" fails
    "GROUP",      // #2 Collision: "GROUP BY" clause conflict
    "ORDER",      // #3 Collision: "ORDER BY" clause conflict
    "KEY",        // Used for indexes, often conflicts with 'api_key' or 'foreign_key'
    "KEYS",       // Plural form
    "INDEX",      // Database index
    "RANK",       // Reserved in MySQL 8.0+ (Window functions)
    "SYSTEM",     // Reserved in MySQL 8.0+
    "FUNCTION",   // Stored procedures
    "RANGE",      // Partitioning
    "ROW",        // Reserved in MySQL 8.0.2+
    "ROWS",       // Reserved in MySQL 8.0.2+
    "VALUE",      // Often used for generic data columns (Note: 'VALUES' is the strict reserved form, but 'VALUE' is a keyword)
    "VALUES",     // Strict reserved word
    "CHECK",      // Constraint keyword
    "CONDITION",  // Error handling
    "USAGE",      // Grant usage

    // --- Date & Time Nouns ---
    // Note: 'DATE', 'TIME', 'TIMESTAMP', and 'YEAR' are NOT reserved in all contexts 
    // but are highly dangerous due to function name collisions. 
    // The ones below are STRICTLY reserved.
    "CURRENT_DATE",
    "CURRENT_TIME",
    "CURRENT_TIMESTAMP",
    "CURRENT_USER",
    "UTC_DATE",
    "UTC_TIME",
    "UTC_TIMESTAMP",

    // --- Execution & Logic (Verbs) ---
    "ADD", "ALL", "ALTER", "AND", "AS",
    "BETWEEN", "BOTH", "BY",
    "CALL", "CASE", "CHANGE", "CONSTRAINT", "CREATE", "CROSS",
    "DELETE", "DESC", "DESCRIBE", "DISTINCT", "DROP",
    "EACH", "ELSE", "ELSEIF", "EXCEPT", "EXISTS", "EXPLAIN",
    "FALSE", "FETCH", "FOR", "FORCE", "FOREIGN", "FROM", "FULL",
    "GRANT", "HAVING",
    "IF", "IN", "INNER", "INSERT", "INTERVAL", "INTO", "IS",
    "JOIN", "LEADING", "LEFT", "LIKE", "LIMIT", "LOCK", "LOOP",
    "MATCH", "NATURAL", "NOT", "NULL",
    "ON", "OPTION", "OR", "OUT", "OUTER", "OVER",
    "PRIMARY", "PROCEDURE",
    "READ", "READS", "REFERENCES", "RELEASE", "RENAME", "REPEAT", "REPLACE",
    "REQUIRE", "RETURN", "REVOKE", "RIGHT",
    "SELECT", "SET", "SHOW", "SIGNAL", "START",
    "TABLE", "THEN", "TO", "TRAILING", "TRIGGER", "TRUE",
    "UNION", "UNIQUE", "UNLOCK", "UNSIGNED", "UPDATE", "USE", "USING",
    "WHEN", "WHERE", "WHILE", "WINDOW", "WITH", "WRITE",
    "XOR"
]);

// 1. The Attribute Schema (Handles BOTH flat hidden attributes and nested visual nodes)
export const attributeSchema = z.preprocess(
    (attr: any) => ({
        name: attr?.name || attr?.data?.label || '',
        dataType: attr?.dataType || attr?.data?.dataType || '',
        size: attr?.size || attr?.data?.size || '',
        // 🌟 FIX 1: Safely extract attributeType, defaulting to 'simple'
        attributeType: String(attr?.attributeType || attr?.data?.attributeType || 'simple').toLowerCase().trim()
    }),
    z.object({
        name: z.string().min(1, { message: "Column name cannot be empty" }),
        // 🌟 FIX 2: Make this optional here so Zod doesn't crash before reaching the refine block!
        dataType: z.string().optional(),
        attributeType: z.string().optional(),
        size: z.string().optional()
    }).refine((attr) => {
        // datatype check
        if (attr.attributeType === 'composite') {
            return true; // Pass instantly if composite
        }
        return !!attr.dataType && attr.dataType.trim().length > 0;
    }, { message: "Data type is required", path: ["dataType"] }
    ).refine((attr) => {
        // size check
        if (attr.attributeType === 'composite') {
            return true; // Pass instantly if composite
        }

        const dataType = attr.dataType?.toUpperCase?.() ?? '';
        if ((dataType === 'VARCHAR' || dataType === 'CHAR') && (!attr.size || attr.size.trim() === '')) {
            return false;
        }
        return true;
    }, { message: "VARCHAR/CHAR requires a size", path: ["size"] }
    ).refine((attr) => {
        // THE GATEKEEPER: Check if the uppercase name is in our Set
        return !SQL_RESERVED_WORDS.has(attr.name.toUpperCase());
    }, { message: `Attribute Name cannot be an SQL reserved keyword`, path: ["name"] }
    )
);

// 2. The Entity Schema
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
        // Only check physical columns (composites themselves don't become columns, their children do)
        if (attr.attributeType !== 'composite') {
            if (colNames.has(attr.name)) {
                return false;
            }
            colNames.add(attr.name);
        }
    }

    return true;
}, {
    message: "Duplicate column names are not allowed",
    path: ["attributes"],
}).refine((entity) => {
    // THE GATEKEEPER: Check if the uppercase name is in our Set
    return !SQL_RESERVED_WORDS.has(entity.data.label.toUpperCase());
}, {
    message: `Entity Name cannot be an SQL reserved keyword`,
    path: ["data", "label"] // 🌟 FIX 3: Point the error exactly to data.label so the Validation Console catches it properly!
});

// 3. The Master Schema
export const databaseSchema = z.array(entitySchema);