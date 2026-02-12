import { genkit, type Genkit } from 'genkit';
import { openAI } from '@genkit-ai/compat-oai/openai';
import { devLocalVectorstore } from '@genkit-ai/dev-local-vectorstore';

export type GenkitRagClientConfig = {
    indexName: string;
    promptDir: string;
    embedderModel: string;
};

export const createGenkitRagClient = (config: GenkitRagClientConfig): Genkit =>
    genkit({
        promptDir: config.promptDir,
        plugins: [
            openAI(),
            devLocalVectorstore([
                {
                    indexName: config.indexName,
                    embedder: openAI.embedder(config.embedderModel || 'text-embedding-3-small'),
                },
            ]),
        ],
    });
