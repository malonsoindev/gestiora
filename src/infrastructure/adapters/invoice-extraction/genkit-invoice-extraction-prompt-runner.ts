import { z } from '@genkit-ai/core/schema';
import { genkit } from 'genkit/beta';
import { openAI } from '@genkit-ai/compat-oai/openai';

export type InvoiceExtractionPromptOutput = {
    providerCif?: string;
    provider?: {
        razonSocial?: string;
        cif?: string;
        direccion?: string;
        poblacion?: string;
        provincia?: string;
        pais?: string;
    };
    invoice: {
        numeroFactura?: string;
        fechaOperacion?: string;
        fechaVencimiento?: string;
        baseImponible?: number;
        iva?: number;
        total?: number;
        movements?: Array<{
            concepto: string;
            cantidad: number;
            precio: number;
            baseImponible?: number;
            iva?: number;
            total: number;
        }>;
    };
    missingFields?: string[];
};

type GenkitInvoicePromptRunnerConfig = {
    model: string;
};

type InvoiceMovementOutput = NonNullable<InvoiceExtractionPromptOutput['invoice']['movements']>[number];

const invoiceMovementSchema = z.object({
    concepto: z.string().describe('Movimiento concept.'),
    cantidad: z.coerce.number().describe('Movement quantity.'),
    precio: z.coerce.number().describe('Unit price.'),
    baseImponible: z.coerce.number().describe('Tax base.').nullable().optional(),
    iva: z.coerce.number().describe('VAT amount.').nullable().optional(),
    total: z.coerce.number().describe('Movement total.'),
});

const providerSchema = z.object({
    razonSocial: z.string().describe('Provider legal name.').nullable().optional(),
    cif: z.string().describe('Provider CIF or VAT number.').nullable().optional(),
    direccion: z.string().describe('Provider address.').nullable().optional(),
    poblacion: z.string().describe('Provider city.').nullable().optional(),
    provincia: z.string().describe('Provider province.').nullable().optional(),
    pais: z.string().describe('Provider country.').nullable().optional(),
});

const invoiceSchema = z.object({
    providerCif: z.string().describe('Provider CIF or VAT number.').nullable().optional(),
    provider: providerSchema.describe('Provider data.').nullable().optional(),
    numeroFactura: z.string().describe('Invoice number.').nullable().optional(),
    fechaOperacion: z
        .string()
        .describe('Invoice operation date (YYYY-MM-DD).')
        .nullable()
        .optional(),
    fechaVencimiento: z
        .string()
        .describe('Invoice due date (YYYY-MM-DD).')
        .nullable()
        .optional(),
    baseImponible: z.coerce.number().describe('Tax base.').nullable().optional(),
    iva: z.coerce.number().describe('VAT total.').nullable().optional(),
    total: z.coerce.number().describe('Invoice total.').nullable().optional(),
    movements: z.array(invoiceMovementSchema).describe('Invoice movements.').optional(),
    missingFields: z.array(z.string()).describe('Missing fields.').optional(),
});

export const createGenkitInvoicePromptRunner = (
    config: GenkitInvoicePromptRunnerConfig,
): ((context: string) => Promise<InvoiceExtractionPromptOutput>) => {
    const ai = genkit({
        plugins: [openAI()],
        model: openAI.model(config.model),
    });

    const prompt = ai.definePrompt({
        name: 'Invoice Extraction Prompt',
        description: 'Extract invoice data into JSON.',
        system: 'You extract structured invoice data from documents.',
        prompt: `
RULES:
- Extract only explicit information from the text.
- Follow the output schema strictly.
- Do not infer or invent values.
- Use null for missing or unreadable fields.
- Provide missingFields for any missing important values.
- Dates must use YYYY-MM-DD.
- The VAT percentage can be detailed in various ways; it can be presented as a whole number, it can be next to the % symbol, or it can be enclosed in parentheses.
- Cuando los movimientos no se le indica el porcentaje de IVA de manera explicita, se asume que el valor es el mismo que el que marca la factura. Si no se indicase en el movimiento base imponible, se asumita que el campo que marque el total será base imponible y la cantidad de iva podra ser calculada asi como el total final del movimiento.

DOCUMENT CONTEXT:
{{context}}
        `,
        tools: [],
        output: {
            schema: invoiceSchema,
        },
    });

    return async (context: string) => {
        const { output } = await prompt({ context });
        if (!output) {
            throw new Error('Prompt returned no output');
        }

        const invoice: InvoiceExtractionPromptOutput['invoice'] = {};
        if (output.numeroFactura !== null && output.numeroFactura !== undefined) {
            invoice.numeroFactura = output.numeroFactura;
        }
        if (output.fechaOperacion !== null && output.fechaOperacion !== undefined) {
            invoice.fechaOperacion = output.fechaOperacion;
        }
        if (output.fechaVencimiento !== null && output.fechaVencimiento !== undefined) {
            invoice.fechaVencimiento = output.fechaVencimiento;
        }
        if (output.baseImponible !== null && output.baseImponible !== undefined) {
            invoice.baseImponible = output.baseImponible;
        }
        if (output.iva !== null && output.iva !== undefined) {
            invoice.iva = output.iva;
        }
        if (output.total !== null && output.total !== undefined) {
            invoice.total = output.total;
        }
        if (output.movements !== null && output.movements !== undefined) {
            invoice.movements = output.movements.map((movement) => {
                const normalized = {
                    concepto: movement.concepto,
                    cantidad: movement.cantidad,
                    precio: movement.precio,
                    total: movement.total,
                } as InvoiceMovementOutput;

                if (movement.baseImponible !== null && movement.baseImponible !== undefined) {
                    normalized.baseImponible = movement.baseImponible;
                }
                if (movement.iva !== null && movement.iva !== undefined) {
                    normalized.iva = movement.iva;
                }

                return normalized;
            });
        }

        const result: InvoiceExtractionPromptOutput = { invoice };
        if (output.providerCif !== null && output.providerCif !== undefined) {
            result.providerCif = output.providerCif;
        }
        if (output.provider !== null && output.provider !== undefined) {
            const provider: InvoiceExtractionPromptOutput['provider'] = {};
            if (output.provider.razonSocial !== null && output.provider.razonSocial !== undefined) {
                provider.razonSocial = output.provider.razonSocial;
            }
            if (output.provider.cif !== null && output.provider.cif !== undefined) {
                provider.cif = output.provider.cif;
            }
            if (output.provider.direccion !== null && output.provider.direccion !== undefined) {
                provider.direccion = output.provider.direccion;
            }
            if (output.provider.poblacion !== null && output.provider.poblacion !== undefined) {
                provider.poblacion = output.provider.poblacion;
            }
            if (output.provider.provincia !== null && output.provider.provincia !== undefined) {
                provider.provincia = output.provider.provincia;
            }
            if (output.provider.pais !== null && output.provider.pais !== undefined) {
                provider.pais = output.provider.pais;
            }

            if (Object.keys(provider).length > 0) {
                result.provider = provider;
            }
        }
        if (output.missingFields !== null && output.missingFields !== undefined) {
            result.missingFields = output.missingFields;
        }

        return result;
    };
};
