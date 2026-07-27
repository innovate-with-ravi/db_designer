import { config } from "dotenv";
config();
import { erArchitectAgent } from "./app/Agents/graph";
import { AgentState } from "./app/Agents/state";

async function runTest() {
  const initialState: typeof AgentState.State = {
    scenario: "test scenario",
    jsonSchema: null,
    isSchemaValid: false,
    dialect: "mysql",
    schemaErrors: [],
    schemaFixRetries: 0,
    generatedSql: null,
    scriptErrors: [],
    isScriptValid: false,
    scriptFixRetries: 0,
    isVersion1Sql: false,
  };

  try {
    const stream = await erArchitectAgent.stream(initialState, { streamMode: "values" });
    for await (const chunk of stream) {
      console.log("=== STATE UPDATE ===");
      console.log("schemaFixRetries:", chunk.schemaFixRetries);
      console.log("isSchemaValid:", chunk.isSchemaValid);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

runTest();
