import { NextResponse } from "next/server";
import { erArchitectAgent } from "@/app/Agents/graph";
import { type AgentState } from "@/app/Agents/state";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Index } from "@upstash/vector";
import { v4 as uuidv4 } from "uuid";

const generateEmbedding = async (text: string, keys?: { gemini?: string }) => {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-2", // Latest Google embedding model
    apiKey: keys?.gemini || process.env.GEMINI_API_KEY,
  });

  let vector = await embeddings.embedQuery(text);

  // Truncate to 1536 dimensions to match OpenAI's default & your Upstash Index
  // (Gemini text-embedding-004 outputs 3072 dims natively)
  if (vector.length > 1536) {
    vector = vector.slice(0, 1536);

    // L2 normalize the truncated vector for cosine similarity
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    if (magnitude > 0) {
      vector = vector.map((val) => val / magnitude);
    }
  }

  return vector;
};

// Initialize Upstash Vector Index
const index = new Index();

export async function POST(request: Request) {
  try {
    const { scenario, diagramId, apiKeys } = await request.json();
    console.log(`[api/generate-er/route.ts] diagramId: ${diagramId}`);
    console.log(
      `[api/generate-er/route.ts] apiKeys: ${JSON.stringify(apiKeys)}`,
    );

    if (!scenario || typeof scenario !== "string") {
      return NextResponse.json(
        { error: "Scenario is required and must be a string." },
        { status: 400 },
      );
    }

    // 1. Generate Embedding for Semantic Caching
    let vector: number[] = [];
    try {
      vector = await generateEmbedding(scenario, apiKeys);
    } catch (error) {
      console.log("error generation vector:", error);
    }

    // 2. Query Upstash Vector for similar scenarios
    try {
      const queryResult = await index.query({
        vector: vector,
        topK: 1,
        includeMetadata: true,
      });

      if (queryResult && queryResult.length > 0) {
        const match = queryResult[0];
        // 90% similarity threshold
        if (match.score >= 0.9 && match.metadata) {
          console.log(`[Semantic Cache HIT] Score: ${match.score}`);
          return NextResponse.json(
            {
              jsonSchema: match.metadata.jsonSchema,
              generatedSql: match.metadata.generatedSql,
              cached: true, // implies the data we get is not newly generated rather previously cached ("display to user")
            },
            { status: 200 },
          );
        }
      }
      console.log("[Semantic Cache MISS] Proceeding to LangGraph.");
    } catch (cacheErr) {
      console.error("[Semantic Cache Error]:", cacheErr);
      // Fall through to LangGraph on cache error
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
    const result = await erArchitectAgent.invoke(initialState, {
      runName: diagramId,
      configurable: { apiKeys },
    });

    // If it hit circuit breaker and failed, the valid states will be false or null
    if (!result.jsonSchema) {
      return NextResponse.json(
        {
          error: `Failed to generate 'ER diagram schema' from the AI.\n${result.schemaErrors?.join("\n") || ""}`,
        },
        { status: 500 },
      );
    }

    // Strict Cache Validation (Phase 2 rule):
    // Only cache if there are NO script errors, NO schema errors, and it's NOT v1 SQL
    const isExecutionValid =
      result.jsonSchema &&
      result.generatedSql &&
      !result.isVersion1Sql &&
      result.scriptErrors?.length === 0 &&
      result.schemaErrors?.length === 0;

    if (isExecutionValid) {
      try {
        await index.upsert({
          id: uuidv4(),
          vector,
          metadata: {
            jsonSchema: result.jsonSchema,
            generatedSql: result.generatedSql,
            scenario: scenario, // useful for debugging
          },
        });

        console.log(
          "[Semantic Cache UPSERT] Successfully saved to Upstash Vector.",
        );
      } catch (upsertErr) {
        console.error("[Semantic Cache Upsert Error]:", upsertErr);
      }
    } else {
      console.log(
        "[Semantic Cache SKIP] LangGraph output was imperfect. Not caching.",
      );
    }

    // either AI generated or v-1 script is sent by erArchitectAgent
    return NextResponse.json(
      {
        jsonSchema: result.jsonSchema,
        generatedSql: result.generatedSql,
        cached: false, // newly ai generated
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
