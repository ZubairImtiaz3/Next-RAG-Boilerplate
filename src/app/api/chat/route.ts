import { createOpenAI as createGroq } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";
import { JinaEmbeddings } from "@langchain/community/embeddings/jina";
import { DataAPIClient } from "@datastax/astra-db-ts";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const groqAI = createGroq({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  compatibility: "compatible",
});

const embeddings = new JinaEmbeddings({
  model: "jina-embeddings-v3",
  apiKey: process.env.JINA_API_KEY,
});

const client = new DataAPIClient(process.env.ASTRA_DB_TOKEN);
const db = client.db(process.env.ASTRA_DB_ENDPOINT!, {
  namespace: process.env.ASTRA_DB_NAMESPACE,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const latestMessage = messages[messages.length - 1]?.content;
    if (!latestMessage) {
      throw new Error("No message found in the request.");
    }

    const embeddingResponse = await embeddings.embedQuery(latestMessage);
    const collection = await db.collection(process.env.ASTRA_DB_COLLECTION!);

    // Query the collection for similar documents based on the vector embedding
    const cursor = await collection.find({}, {
      sort: {
        $vector: embeddingResponse,
      },
      limit: 5,
    });

    const documents = await cursor.toArray();
    const documentsMap = documents.map((doc) => doc.text);
    const documentsContext = JSON.stringify(documentsMap);

    const template = {
      role: "system",
      content: `You are an AI assistant who knows everything about Zubair Imtiaz's portfolio. Use the context provided below to augment your responses based on the most recent portfolio data.
      
      If the context doesn't include the information you need, answer based on existing knowledge, but avoid mentioning whether the context does or doesn't include specific details.

      Format responses using markdown where applicable and don't return any context details in the answer.

      ------
      START CONTEXT
      ${documentsContext}
      END CONTEXT
      ------

      QUESTION: ${latestMessage}`,
    };

    const result = await streamText({
      model: groqAI("llama3-70b-8192"),
      messages: convertToCoreMessages([template, ...messages]),
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("Error in Chat POST function:", error);
    return new Response("An error occurred while processing your request. Please try again later.", { status: 500 });
  }
}
