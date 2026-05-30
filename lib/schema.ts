import { z } from 'zod';

// 1. The Attribute Schema (Handles BOTH flat hidden attributes and nested visual nodes)
export const attributeSchema = z.preprocess(
    (attr: any) => ({
        name: attr?.name || attr?.data?.label || '',
        dataType: attr?.dataType || attr?.data?.dataType || '',
        size: attr?.size || attr?.data?.size || ''
    }),
    z.object({
        name: z.string().min(1, { message: "Column name cannot be empty" }),
        dataType: z.string().min(1, { message: "Data type is required" }),
        size: z.string().optional(),
    }).refine((attr) => {
        if ((attr.dataType === 'VARCHAR' || attr.dataType === 'CHAR') && (!attr.size || attr.size === '')) {
            return false;
        }
        return true;
    }, { message: "VARCHAR/CHAR requires a size", path: ["size"] })
);
// 2. The Entity Schema
export const entitySchema = z.object({
    id: z.string(),
    // Zod must look inside the "data" object because that's where React Flow stores it!
    data: z.object({
        label: z.string().min(1, { message: "Table name is required" }),
        primaryKey: z.string().min(1, { message: "Table is missing a Primary Key" }),
    }),
    attributes: z.array(attributeSchema).min(1, { message: "Table must have at least one attribute" }),
}).refine((entity) => {
    const colNames = new Set<string>();

    for (const attr of entity.attributes) {
        if (colNames.has(attr.name)) {
            return false;
        }
        colNames.add(attr.name);
    }

    return true;
}, {
    message: "Duplicate column names are not allowed",
    path: ["attributes"],
})
// (Note: We removed the old pkCount == 1 refine block because primaryKey is now a single string, so it physically cannot be more than 1).

// 3. The Master Schema
export const databaseSchema = z.array(entitySchema);