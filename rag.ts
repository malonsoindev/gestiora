import postgres from 'postgres';
import { PostgresInvoiceRepository } from './src/infrastructure/persistence/postgres/postgres-invoice.repository.js';
import { PostgresProviderRepository } from './src/infrastructure/persistence/postgres/postgres-provider.repository.js';
import { InvoiceStatus, type Invoice } from './src/domain/entities/invoice.entity.js';
import type { Provider } from './src/domain/entities/provider.entity.js';
import { isOk } from './src/shared/result.js';
import 'dotenv/config';
import { genkit } from 'genkit';
import { Document } from 'genkit/retriever';
import { openAI } from '@genkit-ai/compat-oai/openai';
import { devLocalIndexerRef, devLocalRetrieverRef, devLocalVectorstore } from '@genkit-ai/dev-local-vectorstore';
import { z } from '@genkit-ai/core/schema';

type InvoiceJson = {
    id: string;
    providerId: string;
    status: string;
    headerSource: string;
    headerStatus: string;
    numeroFactura?: string;
    fechaOperacion?: string;
    fechaVencimiento?: string;
    baseImponible?: number;
    iva?: number;
    total?: number;
    fileRef?: {
        storageKey: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
    };
    movements: Array<{
        id: string;
        concepto: string;
        cantidad: number;
        precio: number;
        baseImponible?: number;
        iva?: number;
        total: number;
        source: string;
        status: string;
    }>;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
};

type ProviderJson = {
    id: string;
    razonSocial: string;
    cif?: string;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
};

type InvoiceWithProviderJson = {
    invoice: InvoiceJson;
    provider: ProviderJson | null;
};

type DocumentInput = {
    text: string;
    metadata?: Record<string, string>;
};

const INDEX_NAME = 'gestiora-invoices';

const toIso = (value: Date | undefined): string | undefined => (value ? value.toISOString() : undefined);

const toInvoiceJson = (invoice: Invoice): InvoiceJson => ({
    id: invoice.id,
    providerId: invoice.providerId,
    status: invoice.status,
    headerSource: invoice.headerSource,
    headerStatus: invoice.headerStatus,
    numeroFactura: invoice.numeroFactura,
    fechaOperacion: invoice.fechaOperacion,
    fechaVencimiento: invoice.fechaVencimiento,
    baseImponible: invoice.baseImponible,
    iva: invoice.iva,
    total: invoice.total,
    fileRef: invoice.fileRef
        ? {
              storageKey: invoice.fileRef.storageKey,
              filename: invoice.fileRef.filename,
              mimeType: invoice.fileRef.mimeType,
              sizeBytes: invoice.fileRef.sizeBytes,
              checksum: invoice.fileRef.checksum,
          }
        : undefined,
    movements: invoice.movements.map((movement) => ({
        id: movement.id,
        concepto: movement.concepto,
        cantidad: movement.cantidad,
        precio: movement.precio,
        baseImponible: movement.baseImponible,
        iva: movement.iva,
        total: movement.total,
        source: movement.source,
        status: movement.status,
    })),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    deletedAt: toIso(invoice.deletedAt),
});

const toProviderJson = (provider: Provider): ProviderJson => ({
    id: provider.id,
    razonSocial: provider.razonSocial,
    cif: provider.cif,
    direccion: provider.direccion,
    poblacion: provider.poblacion,
    provincia: provider.provincia,
    pais: provider.pais,
    status: provider.status,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
    deletedAt: toIso(provider.deletedAt),
});

const requireDatabaseUrl = (): string => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL is required');
        process.exit(1);
    }
    return databaseUrl;
};

const fetchAllInvoices = async (
    invoiceRepository: PostgresInvoiceRepository,
    status?: InvoiceStatus,
): Promise<Invoice[]> => {
    const items: Invoice[] = [];
    const pageSize = 200;
    let page = 1;
    let total = 0;

    while (true) {
        const result = await invoiceRepository.list({
            status,
            page,
            pageSize,
        });

        if (!isOk(result)) {
            throw result.error;
        }

        if (total === 0) {
            total = result.value.total;
        }

        if (result.value.items.length === 0) {
            break;
        }

        items.push(...result.value.items);

        if (items.length >= total) {
            break;
        }

        page += 1;
    }

    return items;
};

const loadInvoicesWithProviders = async (): Promise<InvoiceWithProviderJson[]> => {
    const databaseUrl = requireDatabaseUrl();
    const sql = postgres(databaseUrl);
    const invoiceRepository = new PostgresInvoiceRepository(sql);
    const providerRepository = new PostgresProviderRepository(sql);
    const providerCache = new Map<string, Provider | null>();

    try {
        const activeInvoices = await fetchAllInvoices(invoiceRepository);
        const deletedInvoices = await fetchAllInvoices(invoiceRepository, InvoiceStatus.Deleted);
        const invoices = [...activeInvoices, ...deletedInvoices];

        const detailedInvoices: Invoice[] = [];
        for (const invoice of invoices) {
            const detailResult = await invoiceRepository.getDetail(invoice.id);
            if (!isOk(detailResult)) {
                throw detailResult.error;
            }
            if (detailResult.value) {
                detailedInvoices.push(detailResult.value);
            }
        }

        const results: InvoiceWithProviderJson[] = [];
        for (const invoice of detailedInvoices) {
            let provider = providerCache.get(invoice.providerId);
            if (provider === undefined) {
                const providerResult = await providerRepository.findById(invoice.providerId);
                if (!isOk(providerResult)) {
                    throw providerResult.error;
                }
                provider = providerResult.value;
                providerCache.set(invoice.providerId, provider);
            }

            results.push({
                invoice: toInvoiceJson(invoice),
                provider: provider ? toProviderJson(provider) : null,
            });
        }

        return results;
    } finally {
        await sql.end();
    }
};

const createMockUpdate = (): InvoiceWithProviderJson => ({
    invoice: {
        id: 'mock-invoice-1',
        providerId: 'mock-provider-1',
        status: 'ACTIVE',
        headerSource: 'MANUAL',
        headerStatus: 'CONFIRMED',
        numeroFactura: 'RAG-TEST-001',
        fechaOperacion: '2026-02-10',
        fechaVencimiento: '2026-03-10',
        baseImponible: 1000,
        iva: 210,
        total: 1210,
        movements: [
            {
                id: 'mock-movement-1',
                concepto: 'Servicio de consultoria',
                cantidad: 1,
                precio: 1000,
                baseImponible: 1000,
                iva: 210,
                total: 1210,
                source: 'MANUAL',
                status: 'CONFIRMED',
            },
        ],
        createdAt: '2026-02-10T08:00:00.000Z',
        updatedAt: '2026-02-10T08:00:00.000Z',
    },
    provider: {
        id: 'mock-provider-1',
        razonSocial: 'Proveedor Demo SL',
        cif: 'B12345678',
        direccion: 'Calle Falsa 123',
        poblacion: 'Madrid',
        provincia: 'Madrid',
        pais: 'ES',
        status: 'ACTIVE',
        createdAt: '2026-02-10T08:00:00.000Z',
        updatedAt: '2026-02-10T08:00:00.000Z',
    },
});

const addLineItemToFirstInvoice = (rows: InvoiceWithProviderJson[]): InvoiceWithProviderJson[] => {
    if (rows.length === 0) {
        return rows;
    }

    const [first, ...rest] = rows;
    const nextMovements = [...first.invoice.movements];
    nextMovements.push({
        id: 'mock-movement-extra-1',
        concepto: 'Linea adicional de prueba',
        cantidad: 1,
        precio: 50,
        baseImponible: 50,
        iva: 10.5,
        total: 60.5,
        source: 'MANUAL',
        status: 'CONFIRMED',
    });

    const updated: InvoiceWithProviderJson = {
        ...first,
        invoice: {
            ...first.invoice,
            movements: nextMovements,
            updatedAt: new Date().toISOString(),
        },
    };

    return [updated, ...rest];
};

const MOVEMENTS_CHUNK_SIZE = 10;

const buildDocumentInputs = (rows: InvoiceWithProviderJson[]): DocumentInput[] =>
    rows.flatMap((row) => buildInvoiceChunks(row));

const buildInvoiceChunks = (row: InvoiceWithProviderJson): DocumentInput[] => {
    const baseMetadata = {
        invoiceId: row.invoice.id,
        providerId: row.invoice.providerId,
        status: row.invoice.status,
        numeroFactura: row.invoice.numeroFactura ?? '',
        fechaOperacion: row.invoice.fechaOperacion ?? '',
    };
    const baseChunk: DocumentInput = {
        text: JSON.stringify({
            invoice: { ...row.invoice, movements: [] },
            provider: row.provider,
        }),
        metadata: {
            ...baseMetadata,
            chunkType: 'base',
        },
    };

    if (row.invoice.movements.length === 0) {
        return [baseChunk];
    }

    const movementChunks: DocumentInput[] = [];
    for (let i = 0; i < row.invoice.movements.length; i += MOVEMENTS_CHUNK_SIZE) {
        const chunkMovements = row.invoice.movements.slice(i, i + MOVEMENTS_CHUNK_SIZE);
        movementChunks.push({
            text: JSON.stringify({
                invoice: {
                    ...row.invoice,
                    movements: chunkMovements,
                },
                provider: row.provider,
            }),
            metadata: {
                ...baseMetadata,
                chunkType: 'movements',
                chunkIndex: String(Math.floor(i / MOVEMENTS_CHUNK_SIZE)),
            },
        });
    }

    return [baseChunk, ...movementChunks];
};

const createAi = () =>
    genkit({
        promptDir: './prompts',
        plugins: [
            openAI(),
            devLocalVectorstore([
                {
                    indexName: INDEX_NAME,
                    embedder: openAI.embedder('text-embedding-3-small'),
                },
            ]),
        ],
    });

const ai = createAi();
const ragQueryPrompt = ai.prompt('rag-query');

const documentInputSchema = z.object({
    text: z.string().min(1),
    metadata: z.record(z.string(), z.string()).optional(),
});

const indexDocumentsFlow = ai.defineFlow(
    {
        name: 'ragIndexInvoices',
        inputSchema: z.object({
            rows: z.array(
                z.object({
                    invoice: z.record(z.string(), z.any()),
                    provider: z.record(z.string(), z.any()).nullable(),
                }),
            ),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            documentsIndexed: z.number(),
            error: z.string().optional(),
        }),
    },
    async ({ rows }) => {
        try {
            // 3.1.- Conversion a documentos
            const documents = await ai.run('conversion-documentos-flow', async () => buildDocumentInputs(rows as InvoiceWithProviderJson[]));

            // devLocalVectorstore solo para MVP/prototipo
            const indexer = devLocalIndexerRef(INDEX_NAME);
            const indexedDocuments = documents.map((doc) => Document.fromText(doc.text, doc.metadata));
            await ai.index({
                indexer,
                documents: indexedDocuments,
            });
            return {
                success: true,
                documentsIndexed: indexedDocuments.length,
            };
        } catch (error) {
            return {
                success: false,
                documentsIndexed: 0,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
);

const queryFlow = ai.defineFlow(
    {
        name: 'ragQueryInvoices',
        inputSchema: z.object({
            query: z.string().min(1),
        }),
        outputSchema: z.object({
            answer: z.string(),
            error: z.string().optional(),
            errorCode: z.string().optional(),
        }),
    },
    async ({ query }) => {
        try {
            const retriever = devLocalRetrieverRef(INDEX_NAME);
            const docs = await ai.retrieve({
                retriever,
                query,
                options: { k: 5 },
            });
            const modelName = process.env.OAI_MODEL_NAME ?? 'gpt-4o-mini';
            const { text } = await ragQueryPrompt(
                { query },
                {
                    model: openAI.model(modelName),
                    docs,
                },
            );
            return { answer: text };
        } catch (error) {
            return {
                answer: 'No hay datos disponibles.',
                error: error instanceof Error ? error.message : String(error),
                errorCode: error instanceof Error ? error.name : 'UnknownError',
            };
        }
    },
);

const run = async (): Promise<void> => {
    // 1.- Captura de datos
    const data = await ai.run('captura-datos', async () => loadInvoicesWithProviders());

    // 1.1.- Simulacion de actualizacion (linea adicional)
    const dataWithExtraLine = await ai.run('simulacion-linea-extra', async () =>
        addLineItemToFirstInvoice(data),
    );

    // 2.- Indexado en vector store local
    const indexResult = await indexDocumentsFlow({ rows: dataWithExtraLine });
    if (!indexResult.success) {
        throw new Error(indexResult.error ?? 'Indexing failed');
    }

    // 3.1.- Actualizacion simulada (sin base de datos)
    const mockUpdate = await ai.run('mock-update', async () => createMockUpdate());
    const mockIndexResult = await indexDocumentsFlow({ rows: [mockUpdate] });
    if (!mockIndexResult.success) {
        throw new Error(mockIndexResult.error ?? 'Mock indexing failed');
    }

    // 4.- Confirmacion
    console.log(`Indexed ${indexResult.documentsIndexed} documents into ${INDEX_NAME}`);

    // 5.- Consulta opcional
    const query = process.argv.slice(2).join(' ').trim();
    if (!query) {
        console.log('No query provided. Add a query argument to retrieve answers.');
        return;
    }

    // 6.- Retrieval y respuesta
    const answerResult = await queryFlow({ query });
    console.log(answerResult.answer);
};

await run().catch((error) => {
    console.error('Failed to load invoices:', error);
    process.exit(1);
});
