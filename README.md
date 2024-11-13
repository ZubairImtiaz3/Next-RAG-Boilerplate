# Next RAG Boilerplate

A simplest Retrieval Augmented Generation (RAG) boilerplate using free-tier services. Perfect for developers wanting to experiment with RAG without spending money on API credits.

## Features

-  Uses free-tier services
-  Built with Next.js, LangChain, DataStax Astra.
-  Vector similarity search
-  Streaming responses
-  Progress tracking for data ingestion

## Tech Stack

- **Vector Database**: DataStax Astra DB
- **Embeddings**: Jina AI V3
- **LLM**: Groq llama 70b
- **Markdown Scraping**: Markdowner API
- **Framework**: Next.js

## Prerequisites

Before you begin, you'll need to create accounts and get API keys from:

1. [DataStax Astra](https://astra.datastax.com/signup) - Vector Database
2. [Jina AI](https://jina.ai/) - Embeddings API
3. [Groq](https://console.groq.com/signup) - LLM API
4. [md.dhr.wtf](https://md.dhr.wtf/) - Markdowner Scraping API

## Setup Instructions

1. Clone this repository:
```bash
git clone https://github.com/yourusername/rag-boilerplate
cd rag-boilerplate
```

## Install dependencies:

```bash
npm install
```

## Create a .env.local file with your API keys:

```env
# Astra DB Configuration
ASTRA_DB_TOKEN="your_astra_token"
ASTRA_DB_ENDPOINT="your_astra_endpoint"
ASTRA_DB_NAMESPACE="your_namespace"
ASTRA_DB_COLLECTION="your_collection_name"

# API Keys
JINA_API_KEY="your_jina_api_key"
GROQ_API_KEY="your_groq_api_key"
MARKDOWNER_API_KEY="your_markdowner_api_key"
```

## Modify the URLs in seedDb.ts to point to your website:

```typescript
const urls = [
    "https://your-website.com/",
    "https://your-website.com/about",
    // Add more URLs...
];
```

## Run the database seeding script:

```bash
npm run seed
```

## Start the development server:

```bash
npm run dev
```

## API Endpoints

### POST /api/chat

Handles chat interactions with the RAG system.

**Request Body:**

```json
{
    "messages": [
        {
            "role": "system",
            "content": "Your question here"
        }
    ]
}
```

## Customization

### Modifying the Chunk Size

In `seedDb.ts`, adjust the `chunkSize` and `chunkOverlap` values:

```typescript
const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 1024,  // Adjust this value
    chunkOverlap: 100, // Adjust this value
});
```

### Changing the System Prompt

In `route.ts`, modify the `template` object to customize the AI's behavior:

```typescript
const template = {
    role: "system",
    content: `Your custom system prompt here...`
};
```

## Limitations

The free tier services have rate limits:

- **Jina AI**: 1M embeddings/month (You can obtain a new API key by visiting https://jina.ai/ in incognito mode).
- **Astra DB**: 40GB storage
- **Groq**: up to 9,000 tokens per minute, with a daily limit of 144,000 tokens.
- **Markdowner**: 100 request/per min

- Currently only supports markdown content

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this in your own projects!
