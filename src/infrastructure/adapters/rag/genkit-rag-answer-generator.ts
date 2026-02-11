import type { Genkit } from 'genkit';
import { Document } from 'genkit/retriever';
import { ok, fail, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { RagAnswerGenerator, RagGenerateRequest } from '../../../application/ports/rag-answer-generator.js';
import { openAI } from '@genkit-ai/compat-oai/openai';

export type GenkitRagAnswerGeneratorDependencies = {
    ai: Genkit;
    modelName: string;
    promptName: string;
};

export class GenkitRagAnswerGenerator implements RagAnswerGenerator {
    private readonly prompt: ReturnType<Genkit['prompt']>;

    constructor(private readonly dependencies: GenkitRagAnswerGeneratorDependencies) {
        this.prompt = dependencies.ai.prompt(dependencies.promptName);
    }

    async generate(request: RagGenerateRequest): Promise<Result<string, PortError>> {
        try {
            const docs = request.documents.map((doc) => Document.fromText(doc.text, doc.metadata));
            const response = await this.prompt(
                { query: request.query },
                {
                    model: openAI.model(this.dependencies.modelName),
                    docs,
                },
            );
            return ok(response.text);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('RagAnswerGenerator', 'Failed to generate answer', cause));
        }
    }
}
