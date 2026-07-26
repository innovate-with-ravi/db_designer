// LLMs hate deeply nested, arbitrary wrappers.
// For the AI Agent, we need a pristine, flat "Logical Contract." We will let the LLM generate this attribute clean logical data, and then we will write a {{tiny adapter}} later to wrap it back into React Flow's messy id and data format.

import { z } from "zod";
import { SQL_RESERVED_WORDS } from "@/lib/schema";

// ==========================================
// 1. BASE SCHEMAS (Purely Structural for LLM)
// ==========================================

export const AgentAttributeSchemaBase = z.object({
  name: z.string().describe("Column name. Must be snake_case, e.g., user_id or first_name"),
  dataType: z.string().describe("Standard SQL data type (e.g., INT, VARCHAR, DATE, BOOLEAN)"),
  size: z.string().nullable().describe("Size for VARCHAR or CHAR types, e.g., '255'"),
  attributeType: z.enum(["simple", "composite", "derived", "multivalued"]),
  isPrimaryKey: z.boolean().describe("Set to true if this attribute is part of the primary key(maybe composite)."),
  isNotNull: z.boolean().describe("Set to true if this attribute is not part of the primary key and still needs to have a value i.e. can't be null."),
  isUnique: z.boolean().describe("Set to true if this attribute is not part of the primary key and still must be unique."),
});

export const AgentEntitySchemaBase = z.object({
  name: z.string().describe("Entity/Table name. MUST be a singular noun and UPPERCASE, e.g., STUDENT"),
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
// 2. VALIDATION SCHEMAS (Strict Rules for Critic)
// ==========================================

export const AgentAttributeSchema = AgentAttributeSchemaBase
  .refine((attr) => !SQL_RESERVED_WORDS.has(attr.name.toUpperCase()), {
    message: "Attribute Name cannot be an SQL reserved keyword",
    path: ["name"],
  })
  .refine((attr) => {
    if (attr.attributeType === "composite") return true;
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