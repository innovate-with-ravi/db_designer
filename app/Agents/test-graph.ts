import { config } from "dotenv";
// Load environment variables from .env file
config();
import { erArchitectAgent } from "./graph";
import { AgentState } from "./state";

async function runTest() {
  console.log("🚀 Starting LangGraph execution...");

  // The initial state matching your AgentState schema
  const initialState: typeof AgentState.State = {
    scenario:
      "An e-commerce system with users, products, and orders. An order can have multiple products.",
    jsonSchema: null,
    isSchemaValid: false,
    dialect: null,
    schemaErrors: [],
    schemaFixRetries: 0,
    generatedSql: null,
    scriptErrors: [],
    isScriptValid: false,
    scriptFixRetries: 0,
    isVersion1Sql: false,
  };

  try {
    // Invoke the graph
    const finalState = await erArchitectAgent.invoke(initialState);

    console.log("✅ Execution Complete!");
    console.log("\n=== Refined SQL BY semanticRefinerNode ===");
    console.log(finalState.generatedSql);

    if (!finalState.isSchemaValid) {
      console.log("\n⚠️ Schema Errors:");
      console.log(finalState.schemaErrors);
    }

    console.log(`\n🔍 View the full trace on your LangSmith dashboard!`);
  } catch (error) {
    console.error("❌ Error during execution:", error);
  }
}

runTest();
