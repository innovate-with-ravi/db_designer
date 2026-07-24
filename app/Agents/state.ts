import { StateSchema, ReducedValue } from "@langchain/langgraph";
import * as z from "zod";
import { AgentDiagramSchema } from "./schemas";

export const AgentState = new StateSchema({
  // Input
  scenario: z.string(),

  // Phase 1: High-level ER Schema
  jsonSchema: z.custom<z.infer<typeof AgentDiagramSchema>>().nullable(),

  // Reducer for appending schema errors instead of overwriting them
  schemaErrors: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      reducer: (left: string[], right: string[]) => left.concat(right),
    },
  ),

  // Phase 2: Compilation & Semantic Naming
  generatedSql: z.string().nullable(),

  scriptErrors: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      reducer: (left: string[], right: string[]) => left.concat(right),
    },
  ),
});
