import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { DataAPIClient } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { JinaEmbeddings } from "@langchain/community/embeddings/jina";

dotenv.config({ path: '.env.local' });

const {
    ASTRA_DB_TOKEN,
    ASTRA_DB_ENDPOINT,
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    JINA_API_KEY,
    MARKDOWNER_API_KEY
} = process.env;

const client = new DataAPIClient(ASTRA_DB_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT!, {
    namespace: ASTRA_DB_NAMESPACE,
});

const embeddings = new JinaEmbeddings({
    model: "jina-embeddings-v3",
    apiKey: JINA_API_KEY
});

const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 512,
    chunkOverlap: 50,
});

// List of URLs to scrape
const urls = [
    "https://zubair-imtiaz.vercel.app/",
    "https://zubair-imtiaz.vercel.app/projects/01-gitissuefy/",
    "https://zubair-imtiaz.vercel.app/projects/gitissuefy/",
    "https://zubair-imtiaz.vercel.app/projects/mattemost/",
    "https://zubair-imtiaz.vercel.app/projects/stripe-flutterflow-pricing/",
    "https://zubair-imtiaz.vercel.app/projects/contentify/",
    "https://zubair-imtiaz.vercel.app/projects/trade-ease/"
];

// Progress Tracker File Path
const progressFilePath = 'src/scripts/progress.json';

const loadProgress = () => {
    if (fs.existsSync(progressFilePath)) {
        return JSON.parse(fs.readFileSync(progressFilePath, 'utf-8'));
    }
    return { processedUrls: {}, totalChunksProcessed: 0 };
};

const saveProgress = (progress: any) => {
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
};

const fetchMarkdown = async (url: string) => {
    const response = await fetch(`https://md.dhr.wtf/?url=${url}`, {
        headers: { 'Authorization': `Bearer ${MARKDOWNER_API_KEY}` }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch markdown for ${url}: ${response.statusText}`);
    }
    return await response.text();
};

const loadSampleData = async () => {
    const progress = loadProgress();

    try {
        const collection = await db.createCollection(ASTRA_DB_COLLECTION!, {
            vector: {
                dimension: 1024,
                metric: 'cosine',
            },
            checkExists: false,
        });

        console.log(`Created collection: ${ASTRA_DB_COLLECTION}`);

        for (const url of urls) {
            // Skip URL if already processed
            if (progress.processedUrls[url]) {
                console.log(`Skipping URL already processed: ${url}`);
                continue;
            }

            console.log(`Processing URL: ${url}`);
            const markdown = await fetchMarkdown(url);

            if (!markdown) {
                console.log(`Skipping empty content for URL: ${url}`);
                continue;
            }

            const chunks = await splitter.createDocuments([markdown]);
            console.log(`Splitting content into ${chunks.length} chunks`);

            try {
                const embeddingResponse = await embeddings.embedDocuments(chunks.map(chunk => chunk.pageContent));

                if (!embeddingResponse || embeddingResponse.length === 0) {
                    throw new Error('API limit reached or failed embedding response');
                }

                // Insert each chunk with metadata, embedding and text
                for (let i = 0; i < chunks.length; i++) {
                    const vector = embeddingResponse[i];
                    const text = chunks[i].pageContent;
                    const metadata = chunks[i].metadata;

                    const res = await collection.insertOne({
                        $vector: vector,
                        text,
                        metadata
                    });

                    console.log(`Inserted chunk with metadata into collection: ${res}`);

                    // Update progress after each chunk
                    progress.totalChunksProcessed++;
                    saveProgress(progress);
                }

            } catch (error) {
                console.error("Error embedding chunk:", error);
                break;
            }

            // Mark URL as processed once all chunks are handled
            progress.processedUrls[url] = true;
            saveProgress(progress);
        }
    } catch (error) {
        console.error("Error during data loading:", error);
    }
};

(async () => {
    try {
        console.log("Starting to load sample data...");
        await loadSampleData();
        console.log("Data loading completed successfully.");
    } catch (error) {
        console.error("Error loading sample data:", error);
    } finally {
        await client.close();
    }
})();
