// LLMs hate deeply nested, arbitrary wrappers.
// For the AI Agent, we need a pristine, flat "Logical Contract." We will let the LLM generate this attribute clean logical data, and then we will write a {{tiny adapter}} later to wrap it back into React Flow's messy id and data format.

import { z } from "zod";
import { SQL_RESERVED_WORDS } from "@/lib/schema";

// ==========================================
// 1. BASE SCHEMAS (Purely Structural for LLM)
// ==========================================

// attribute or entity name must not be a SQL_RESERVED_WORD
export const AgentAttributeSchemaBase = z.object({
  name: z.string().describe("Column name. Must be snake_case. DO NOT use SQL reserved keywords like USER, ORDER, or GROUP (use user_id, customer_order, etc.)."),
  dataType: z.string().describe("Standard SQL data type (e.g., INT, VARCHAR, DATE, BOOLEAN)"),
  size: z.string().nullable().describe("Size for VARCHAR or CHAR types, e.g., '255'"),
  attributeType: z.enum(["simple", "multivalued", "derived"]).describe("The type of attribute - generally simple, multivalued if it can hold multiple values (eg. phone_no or email of a user), derived is less likely & is only given if this attribute's valude can be derived using some other attribute's value which is attached to same entity(eg. age can be derived from date_of_birth)"),
  isPrimaryKey: z.boolean().describe("Set to true if this attribute is part of the primary key(maybe composite)."),
  isNotNull: z.boolean().describe("Set to true if this attribute is not part of the primary key and still needs to have a value i.e. can't be null."),
  isUnique: z.boolean().describe("Set to true if this attribute is not part of the primary key and still must be unique."),
});

export const AgentEntitySchemaBase = z.object({
  name: z.string().describe("Entity/Table name. MUST be a singular noun and UPPERCASE. DO NOT use SQL reserved keywords like USER, ORDER, or GROUP (use APP_USER, CUSTOMER_ORDER, etc.)."),
  attributes: z.array(AgentAttributeSchemaBase).min(1, "Entity must have at least one attribute"),
});

export const AgentRelationshipSchemaBase = z.object({
  sourceEntity: z.string().describe("Name of the source/parent entity (must exactly match an entity name)"),
  targetEntity: z.string().describe("Name of the target/child entity (must exactly match an entity name)"),
  label: z.string().describe("Verb describing the relationship, e.g., TEACHES, ENROLLS"),
  maxCardinality: z.enum(["1:1", "1:N", "M:N", "M:1"]).describe("The maximum cardinality of the relationship"),
  minCardinality: z.enum(["0:1", "1:0", "1:1"]).describe("The minimum cardinality of the relationship"),
});

export const AgentDiagramSchemaBase = z.object({
  entities: z.array(AgentEntitySchemaBase),
  relationships: z.array(AgentRelationshipSchemaBase),
});

// ==========================================
// 2. VALIDATION SCHEMAS (Strict Rules for schemaCritic)
// ==========================================

export const AgentAttributeSchema = AgentAttributeSchemaBase
  .refine((attr) => !SQL_RESERVED_WORDS.has(attr.name.toUpperCase()), {
    message: "Attribute Name cannot be an SQL reserved keyword",
    path: ["name"],
  })
  .refine((attr) => {
    // if (attr.attributeType === "composite") return true;
    const dataType = attr.dataType.toUpperCase();
    if ((dataType === "VARCHAR" || dataType === "CHAR") && (!attr.size || attr.size.trim() === "")) {
      return false;
    }
    return true;
  }, { message: "VARCHAR/CHAR requires a size", path: ["size"] });

export const AgentEntitySchema = z.object({
  name: z.string().describe("Entity/Table name. MUST be a singular noun and UPPERCASE, e.g., STUDENT"),
  attributes: z.array(AgentAttributeSchema).min(1, "Entity must have at least one attribute"),
}).refine((entity) => !SQL_RESERVED_WORDS.has(entity.name.toUpperCase()), {
  message: "Entity Name cannot be an SQL reserved keyword",
  path: ["name"],
});

export const AgentRelationshipSchema = AgentRelationshipSchemaBase;

export const AgentDiagramSchema = z.object({
  entities: z.array(AgentEntitySchema),
  relationships: z.array(AgentRelationshipSchema),
});

// ==========================================
// 3. SCRIPT VALIDATION SCHEMA (Phase 3)
// ==========================================

export const ScriptValidationSchema = z.object({
  isValid: z.boolean().describe("True if the script syntax is perfect and execution order (e.g., parent tables before child tables) is strictly correct."),
  errors: z.array(z.string()).describe("Detailed list of SQL/Prisma syntax or logical order error strings. Empty array if perfect.")// need to fix this if we introduce other languages also
});