import { z } from 'zod';

// Define the strict rules for a single column
export const attributeSchema = z.object({
    name: z.string().min(1, { message: "Column name cannot be empty" }),
    dataType: z.string().min(1, { message: "Data type is required" }),
    size: z.string().optional(),
    isPrimaryKey: z.boolean().optional().default(false),
}).refine((data) => {
    // Custom Rule: If it's a VARCHAR, size is mandatory
    if (data.dataType === 'VARCHAR' && (!data.size || data.size === '')) {
        return false;
    }
    return true;
}, { message: "VARCHAR requires a size", path: ["size"] });

// Define the strict rules for a full table
export const entitySchema = z.object({
    id: z.string(),
    label: z.string().min(1, { message: "Table name is required" }),
    attributes: z.array(attributeSchema).min(1, { message: "Table must have at least one attribute" }),
}).refine((entity) => {
    // Custom Rule: Every table must have exactly one Primary Key
    const pkCount = entity.attributes.filter(attr => attr.isPrimaryKey).length;
    return pkCount > 0;
}, { message: "Table must have a Primary Key", path: ["attributes"] });

// The master schema for the entire generated array
export const databaseSchema = z.array(entitySchema);