import fs from 'fs';
import dotenv from 'dotenv';
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { JinaEmbeddings } from "@langchain/community/embeddings/jina";

dotenv.config({ path: '.env.local' });

const {
    ASTRA_DB_TOKEN,
    ASTRA_DB_ENDPOINT,
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    JINA_API_KEY
} = process.env;

const client = new DataAPIClient(ASTRA_DB_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT!, {
    namespace: ASTRA_DB_NAMESPACE,
});

const embeddings = new JinaEmbeddings({
    model: "jina-embeddings-v3",
    apiKey: JINA_API_KEY
});

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
});

// List of URLs to scrape
const urls = [
    "https://zubair-imtiaz.vercel.app/",
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

const scrapePage = async (url: string) => {
    try {
        const loader = new PuppeteerWebBaseLoader(url, {
            launchOptions: { headless: true },
            gotoOptions: { waitUntil: "domcontentloaded" },
        });

        const pageContent = await loader.scrape();

        if (!pageContent) {
            console.warn(`No content found for URL: ${url}`);
            return '';
        }

        return pageContent.replace(/<[^>]*>?/gm, "");
    } catch (error) {
        console.error(`Error scraping page ${url}:`, error);
        return '';
    }
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
            const content = await scrapePage(url);

            if (!content) {
                console.log(`Skipping empty content for URL: ${url}`);
                continue;
            }

            const chunks = await splitter.splitText(content);
            console.log(`Splitting content into ${chunks.length} chunks`);

            for (const chunk of chunks) {
                try {
                    const embeddingResponse = await embeddings.embedQuery(chunk);

                    if (!embeddingResponse || embeddingResponse.length === 0) {
                        throw new Error('API limit reached or failed embedding response');
                    }

                    const vector = embeddingResponse;

                    // Insert the vector and text chunk into the DB collection
                    const res = await collection.insertOne({
                        $vector: vector,
                        text: chunk,
                    });

                    console.log(`Inserted chunk into collection: ${res}`);

                    // Update progress after each chunk
                    progress.totalChunksProcessed++;
                    saveProgress(progress);

                } catch (error) {
                    console.error("Error embedding chunk:", error);
                    break;
                }
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