import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

// 1. Official OpenAI (Fastest, but subject to 429 rate limits)
const officialOpenAI = new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  maxRetries: 0,
});

// 2. Gemini (Incredible free tier, great logic capabilities)
const geminiModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0,
  maxRetries: 0,
});

// 3. GitHub / Azure OpenAI Compatible Endpoint (High latency, proxy)
const githubAzureModel = new ChatOpenAI({
  model: process.env.AI_MODEL || "gpt-4o-mini",
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
  temperature: 0,
  maxRetries: 0,
});

// 4. Groq (Blazing fast open-source models)
const groqModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
  maxRetries: 0,
});

// 5. Local Ollama Model (Zero quota limits, runs on your machine)
// const localOllamaModel = new ChatOpenAI({
//   model: "llama3.1",
//   configuration: { baseURL: "http://localhost:11434/v1" }, // Ollama's local OpenAI-compatible endpoint
//   apiKey: "ollama", // Required by the SDK, but Ollama ignores it
//   temperature: 0,
//   maxRetries: 0,
// });

/**
 * 🌟 EXPORT 1: Generic Resilient Model
 * Use this anywhere in your code for standard text/chat generation.
 */
export const resilientModel = geminiModel.withFallbacks({
  fallbacks: [groqModel, officialOpenAI, githubAzureModel],
});

/**
 * 🌟 EXPORT 2: Structured Resilient Model Factory
 * Use this when you specifically need Zod JSON Schema outputs (like in graph.ts).
 */
export const getResilientStructuredModel = <T extends z.ZodTypeAny>(
  schema: T,
) => {
  // We apply withStructuredOutput to each model individually BEFORE fallbacks.
  // Why? Because different providers handle JSON schema parsing differently under the hood!
  const primary = geminiModel.withStructuredOutput(schema);
  // const fbOllama = localOllamaModel.withStructuredOutput(schema);
  const fb1 = groqModel.withStructuredOutput(schema);
  const fb2 = githubAzureModel.withStructuredOutput(schema);
  const fb3 = officialOpenAI.withStructuredOutput(schema);

  return primary.withFallbacks({
    fallbacks: [fb1, fb2, fb3],
  });
};
