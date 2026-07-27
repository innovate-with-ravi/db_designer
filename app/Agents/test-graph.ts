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
    generatedSql: null,
    scriptErrors: [],
  };

  try {
    // Invoke the graph
    const finalState = await erArchitectAgent.invoke(initialState);

    console.log("✅ Execution Complete!");
    console.log("\n=== Final JSON Schema ===");
    console.log(JSON.stringify(finalState.jsonSchema, null, 2));

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
