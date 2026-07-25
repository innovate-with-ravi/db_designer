import { ReducedValue, StateSchema } from "@langchain/langgraph";
import z from "zod";
import { AgentDiagramSchema } from "./schemas";

export const AgentState = new StateSchema({
  // Input
  scenario: z.string(),

  // Phase 1: High-level ER Schema
  jsonSchema: z.custom<z.infer<typeof AgentDiagramSchema>>().nullable(),

  // Reducer for appending schema errors instead of overwriting them
  schemaErrors /*(errorsAtOneCall[])[]*/: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      reducer: (left: string[], right: string[]) => left.concat(right),
    },
  ),

  isSchemaValid: z.boolean().default(false),

  // Phase 2: Compilation & Semantic Naming
  generatedSql: z.string().nullable(),

  scriptErrors: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      reducer: (left: string[], right: string[]) => left.concat(right),
    },
  ),
});
