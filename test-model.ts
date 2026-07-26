import "dotenv/config";
import { getResilientStructuredModel } from "./app/Agents/model";
import { AgentDiagramSchema } from "./app/Agents/schemas";

async function test() {
    console.log("Testing fallback chain with AgentDiagramSchema...");
    try {
        const model = getResilientStructuredModel(AgentDiagramSchema);
        const response = await model.invoke("Generate an ER diagram for a school with students and teachers.");
        console.log("Fallback Chain Success!");
    } catch (e: any) {
        console.error("Fallback Chain Error:", e.message);
    }
}
test();
