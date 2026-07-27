import { ReducedValue, StateSchema } from "@langchain/langgraph";
import z from "zod";
import { AgentDiagramSchema } from "./schemas";

// State for erArchGraph nodes
export const AgentState = new StateSchema({
  // Input
  scenario: z.string(),
  dialect: z
    .enum(["mysql", "oracle", "prisma"])
    .describe("The language in which user wants the code.")
    .nullable(),

  // Phase 1: High-level ER Schema
  jsonSchema: z.custom<z.infer<typeof AgentDiagramSchema>>().nullable(),

  schemaErrors: z.array(z.string()).default([]),
  schemaFixRetries: z.number().default(0),

  isSchemaValid: z.boolean().default(false),

  // Phase 2: Compilation , Semantic Naming & Script Fixing(correcting)
  generatedSql: z.string().nullable(),

  scriptErrors: z.array(z.string()).default([]),
  scriptFixRetries: z.number().default(0),

  isScriptValid: z.boolean().default(false),
  isVersion1Sql: z.boolean().default(false),
});
