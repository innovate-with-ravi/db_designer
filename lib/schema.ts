import { z } from 'zod';

// Define the strict rules for a single column/attribute
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

export const entitySchema = z.object({
    id: z.string(),
    label: z.string().min(1, { message: "Table name is required" }),

    // Zod now just looks for your single unified string!
    primaryKey: z.string().min(1, { message: "Table is missing a Primary Key" }),

    attributes: z.array(attributeSchema).min(1, { message: "Table must have at least one attribute" }),
}).refine((entity) => {
    // Custom Rule: Every table must have exactly one Primary Key
    const pkCount = entity.attributes.filter(attr => attr.isPrimaryKey).length;
    return pkCount == 1;
}, { message: "Table must have excatly 1 Primary Key", path: ["attributes"] });

// The master schema for the entire generated array of entities(compressedEntities)
export const databaseSchema = z.array(entitySchema);

const dataSchema = z.object({
    label: z.string(),
});

// export const nodeSchema = z.object({
//     id: z.string(),
//     data: dataSchema,
// })

// const result = nodeSchema.parse({ id: 'xyz', data: { label: 'ravi' } });
// console.log(result);