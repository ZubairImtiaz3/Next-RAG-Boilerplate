import { createOpenAI as createGroq } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const groqAI = createGroq({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  compatibility: "compatible",
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: groqAI("llama3-70b-8192"),
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}
