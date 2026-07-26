import { StateGraph, START, END } from "@langchain/langgraph";
import { getResilientStructuredModel } from "./model";
import { AgentState } from "./state";
import { AgentDiagramSchema, AgentDiagramSchemaBase } from "./schemas";
import z from "zod";

// 1. The Generator Node
const generateNode = async (state: typeof AgentState.State) => {
  console.log(`[Node] generateNode running...`);

  const structuredLlm = getResilientStructuredModel(AgentDiagramSchemaBase);

  let prompt = `You are a senior database architect. Generate a logical ER diagram for this scenario: "${state.scenario}".`;

  if (state.schemaErrors.length > 0) {
    prompt += `\n\nWARNING: Your previous attempt failed with these errors. FIX THEM:\n`;
    prompt += state.schemaErrors.slice(-3).join("\n");
  }

  try {
    const response = await structuredLlm.invoke(prompt);
    return {
      jsonSchema: response,
    };
  } catch (error: any) {
    console.error(`[Error] generateNode LLM failure:`, error.message);
    // Return null schema. The critic will catch this and log the failure.
    return { jsonSchema: null };
  }
};

// 2. The Critic Node
const criticNode = async (state: typeof AgentState.State) => {
  console.log(`[criticNode] Checking jsonSchema.`);
  const rawSchema = state.jsonSchema;

  if (!rawSchema) {
    return {
      schemaErrors: ["Schema generation failed. The LLM returned null."],
      isSchemaValid: false,
    };
  }

  const newErrors: string[] = [];

  // ==========================================
  // 1. ZOD VALIDATION (Native Error Formatting)
  // ==========================================
  const parsed = AgentDiagramSchema.safeParse(rawSchema);

  if (!parsed.success) {
    // 🌟 THE FIX: Using Zod's native prettifyError for optimal LLM context
    const prettyErrors = z.prettifyError(parsed.error);

    // We push this as a single, highly readable block for the LLM prompt
    newErrors.push(`Schema Format Errors:\n${prettyErrors}`);
  }

  // ==========================================
  // 2. RELATIONAL VALIDATION (Cross-table logic)
  // ==========================================
  // We run this even if Zod fails so the LLM gets ALL errors in a single loop iteration.
  const entityNames = new Set(rawSchema.entities.map((e) => e.name));

  for (const entity of rawSchema.entities) {
    // Check for Primary Keys
    const hasPK = entity.attributes.some((attr) => attr.isPrimaryKey);
    if (!hasPK) {
      newErrors.push(
        `Relational Error: Entity '${entity.name}' is missing a Primary Key.`,
      );
    }

    // Check for Duplicate Column Names within the same entity
    const colNames = new Set<string>();
    for (const attr of entity.attributes) {
      if (colNames.has(attr.name)) {
        newErrors.push(
          `Relational Error: Entity '${entity.name}' has duplicate column '${attr.name}'.`,
        );
      }
      colNames.add(attr.name);
    }
  }

  // Ensure relationships point to valid entities
  for (const rel of rawSchema.relationships) {
    if (!entityNames.has(rel.sourceEntity)) {
      newErrors.push(
        `Relationship Error: Source Entity '${rel.sourceEntity}' does not exist. Did you mean to connect it to an existing table?`,
      );
    }
    if (!entityNames.has(rel.targetEntity)) {
      newErrors.push(
        `Relationship Error: Target Entity '${rel.targetEntity}' does not exist. Did you mean to connect it to an existing table?`,
      );
    }

    // Optional but recommended: Prevent self-referencing relationship loops if not supported by your UI
    if (rel.sourceEntity === rel.targetEntity) {
      newErrors.push(
        `Relationship Error: Entity '${rel.sourceEntity}' cannot have a relationship with itself in this canvas setup.`,
      );
    }
  }

  // ==========================================
  // 3. FINAL ROUTING DECISION
  // ==========================================
  if (newErrors.length === 0) {
    return { isSchemaValid: true, schemaErrors: [] };
  }

  return {
    schemaErrors: newErrors,
    isSchemaValid: false,
  };
};

// 3. The Router (Circuit Breaker Added, stop after 3 failures)
const routeAfterCritic = (state: typeof AgentState.State) => {
  if (state.isSchemaValid) {
    console.log(`[Router] Schema valid. Routing to END.`);
    return END;
  }

  // THE CIRCUIT BREAKER: Stop the infinite loop if we've failed 3 times
  if (state.schemaErrors.length >= 3) {
    console.warn(
      `[Router] Circuit Breaker triggered. Max retries hit. Routing to END.`,
    );
    return END;
  }

  console.log(`[Router] Schema invalid. Routing back to generator.`);
  return "generator";
};

// 4. Assemble the LangGraph Workflow
const workflow = new StateGraph(AgentState)
  .addNode("generator", generateNode)
  .addNode("critic", criticNode)

  // Define the edges (the flow)
  .addEdge(START, "generator")
  .addEdge("generator", "critic")
  .addConditionalEdges("critic", routeAfterCritic);

// Compile into a runnable agent
export const erArchitectAgent = workflow.compile();
