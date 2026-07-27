import { StateGraph, START, END } from "@langchain/langgraph";
import { getResilientStructuredModel } from "./model";
import { AgentState } from "./state";
import { AgentDiagramSchema, AgentDiagramSchemaBase } from "./schemas";
import z from "zod";
import { traceable } from "langsmith/traceable";

// PHASE 1:

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
    // Return null schema. The schemaCritic will catch this and log the failure.
    return { jsonSchema: null };
  }
};

// 2. The schemaCritic Node
const schemaCriticNode = async (state: typeof AgentState.State) => {
  console.log(`[schemaCriticNode] Checking jsonSchema.`);
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
const routeAfterschemaCritic = (state: typeof AgentState.State) => {
  if (state.isSchemaValid) {
    console.log(`[Router] Schema valid. Routing to END.`);
    return "compile";
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

// PHASE 2:

import { generateSQL } from "@/lib/sqlGenerator";
import { generatePrisma } from "@/lib/prismaGenerator";
// Note: We don't need compileDiagramState anymore, because the AI already gave us the final logical shape(array of entityies with each entity containing an array of all its attributes + relnpEdges[])!

/**
 * ADAPTER PATTERN: Transforms AI JSON into V1 React Flow format
 * so we can reuse our battle-tested SQL Generator without rewriting it.
 */

// 1. The Compiler Node

const adaptSchemaForV1 = traceable(
  (schema: any) => {
    // 1. Mock(copy) the compiledEntities array
    const compiledEntities = schema.entities.map((entity: any) => {
      // Find the primary key to satisfy V1's getPKDetails
      const pkAttr = entity.attributes.find((a: any) => a.isPrimaryKey);

      return {
        id/*id of entity*/: entity.name, // We use the name as the ID so edges can easily connect
        data: {
          label: entity.name,
          primaryKey: pkAttr ? pkAttr.name : "id",
        },
        attributes: entity.attributes.map((attr: any) => ({
          id: attr.name,
          name: attr.name,
          dataType: attr.dataType,
          size: attr.size,
          attributeType: attr.attributeType,
          isNotNull: attr.isNotNull,
          isUnique: attr.isUnique,
          data: { label: attr.name } // V1 fallback
        })),
        foreignKeys: [], // preProcessRelationships needs this initialized
      };
    });

    // 2. Mock the edges array
    const edges = schema.relationships.map((rel: any, index: number) => {
      // Split "1:N" into source="1" and target="N"
      const [sourceMax, targetMax] = rel.cardinality.split(":");// error here CompilerNode Crashed: TypeError: Cannot read properties of undefined (reading 'split')

      return {
        id: `rel_${index}`,
        source: rel.sourceEntity, // Matches the entity.name (which we set as id above)
        target: rel.targetEntity,
        type: "relationship",
        data: {
          label: rel.label,
          sourceMaximumCardinality: sourceMax,
          targetMaximumCardinality: targetMax,
        },
      };
    });

    return { compiledEntities, edges };
  },
  {
    name: 'adaptSchemaForV1',
    run_type: 'child'
  }
);

const compilerNode = async (state: typeof AgentState.State) => {

  const schema = state.jsonSchema;

  if (!schema) {
    return {
      scriptErrors: ["[CompilerNode Error]: No valid JSON schema provided from Phase 1."],
    };
  }

  try {
    // Step 1: Adapt the clean AI JSON into V1's expected format
    const { compiledEntities, edges } = adaptSchemaForV1(schema);

    // Step 2: Pass it to your existing, untouched V1 SQL Generator
    // We use the dialect stored in the new state definition
    let finalScript = ``;

    if (state.dialect === 'prisma')
      finalScript = generatePrisma(compiledEntities, edges);
    else
      finalScript = generateSQL(compiledEntities, edges, state.dialect || 'mysql');

    return {
      generatedSql: finalScript,
      scriptErrors: [] // Clear errors on success
    };
  } catch (error: any) {
    // Catch any crashes (e.g., topological sort failing on weird input)
    return {
      scriptErrors: [`CompilerNode Crashed: ${error}`]
    };
  }
};


// 4. Assemble the LangGraph Workflow
const workflow = new StateGraph(AgentState)
  .addNode("generator", generateNode)
  .addNode("schemaCritic", schemaCriticNode)
  .addNode('compile', compilerNode)

  // Define the edges (the flow)
  .addEdge(START, "generator")
  .addEdge("generator", "schemaCritic")
  .addConditionalEdges("schemaCritic", routeAfterschemaCritic)
  .addEdge("compile", END);

// Compile into a runnable agent
export const erArchitectAgent = workflow.compile();
