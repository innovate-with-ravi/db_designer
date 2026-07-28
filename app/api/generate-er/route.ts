import { NextResponse } from "next/server";
import { erArchitectAgent } from "@/app/Agents/graph";
import { type AgentState } from "@/app/Agents/state";

export async function POST(request: Request) {
  try {
    const { scenario } = await request.json();

    if (!scenario || typeof scenario !== "string") {
      return NextResponse.json(
        { error: "Scenario is required and must be a string." },
        { status: 400 },
      );
    }

    // Invoke the LangGraph agent
    const initialState: typeof AgentState.State = {
      scenario,
      jsonSchema: null,
      schemaErrors: [],
      isSchemaValid: false,
      schemaFixRetries: 0,
      generatedSql: "",
      scriptErrors: [],
      isScriptValid: false,
      scriptFixRetries: 0,
      dialect: "mysql",
      isVersion1Sql: false,
    };

    // The LangGraph agent runs its cycles and returns the final state
    const result = await erArchitectAgent.invoke(initialState);

    // If it hit circuit breaker and failed, the valid states will be false or null
    if (!result.jsonSchema) {
      return NextResponse.json(
        { error: "Failed to generate 'ER diagram schema' from the AI." },
        { status: 500 },
      );
    }

    // either AI generated or v-1 script is sent by erArchitectAgent
    return NextResponse.json(
      {
        jsonSchema: result.jsonSchema,
        generatedSql: result.generatedSql,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[Generate ER API Error]:", error);
    
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
