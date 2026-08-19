import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

export type UserApiKeys = {
  openai?: string;
  gemini?: string;
  groq?: string;
};

// Factory functions to create models per-request
const createModels = (keys?: UserApiKeys) => {
  const officialOpenAI = new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: keys?.openai || process.env.OPENAI_API_KEY,
    temperature: 0,
    maxRetries: 0,
  });

  const geminiModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: keys?.gemini || process.env.GEMINI_API_KEY,
    temperature: 0,
    maxRetries: 0,
  });

  const githubAzureModel = new ChatOpenAI({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    configuration: { baseURL: process.env.AI_ENDPOINT },
    apiKey: process.env.AI_API_KEY,
    temperature: 0,
    maxRetries: 0,
  });

  const groqModel = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: keys?.groq || process.env.GROQ_API_KEY,
    temperature: 0,
    maxRetries: 0,
  });

  return { officialOpenAI, geminiModel, githubAzureModel, groqModel };
};

/**
 * 🌟 EXPORT 1: Generic Resilient Model Factory
 * Use this anywhere in your code for standard text/chat generation.
 */
export const getResilientModel = (keys?: UserApiKeys) => {
  const { officialOpenAI, geminiModel, githubAzureModel, groqModel } = createModels(keys);
  
  return geminiModel.withFallbacks({
    fallbacks: [groqModel, officialOpenAI, githubAzureModel],
  });
};

/**
 * 🌟 EXPORT 2: Structured Resilient Model Factory
 * Use this when you specifically need Zod JSON Schema outputs (like in graph.ts).
 */
export const getResilientStructuredModel = <T extends z.ZodTypeAny>(
  schema: T,
  keys?: UserApiKeys
) => {
  const { officialOpenAI, geminiModel, githubAzureModel, groqModel } = createModels(keys);

  // We apply withStructuredOutput to each model individually BEFORE fallbacks.
  // Why? Because different providers handle JSON schema parsing differently under the hood!
  const primary = geminiModel.withStructuredOutput(schema);
  const fb1 = groqModel.withStructuredOutput(schema);
  const fb2 = githubAzureModel.withStructuredOutput(schema);
  const fb3 = officialOpenAI.withStructuredOutput(schema);

  return primary.withFallbacks({
    fallbacks: [fb1, fb2, fb3],
  });
};
