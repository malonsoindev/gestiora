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

        const invoice = mapInvoice(output);
        const provider = mapProvider(output.provider ?? null);
        const result: InvoiceExtractionPromptOutput = { invoice };

        setIfPresent(result, 'providerCif', output.providerCif);
        if (provider) {
            result.provider = provider;
        }
        setIfPresent(result, 'missingFields', output.missingFields);

        return result;
    };
};

const isPresent = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

const setIfPresent = <T, K extends string>(
    target: Partial<Record<K, T>>,
    key: K,
    value: T | null | undefined,
): void => {
    if (isPresent(value)) {
        target[key] = value;
    }
};

const mapMovements = (
    movements:
        | Array<{
              concepto: string;
              cantidad: number;
              precio: number;
              baseImponible?: number | null | undefined;
              iva?: number | null | undefined;
              total: number;
          }>
        | null
        | undefined,
): InvoiceMovementOutput[] | undefined => {
    if (!isPresent(movements)) {
        return undefined;
    }

    return movements.map((movement) => {
        const normalized: InvoiceMovementOutput = {
            concepto: movement.concepto,
            cantidad: movement.cantidad,
            precio: movement.precio,
            total: movement.total,
        };

        setIfPresent(normalized, 'baseImponible', movement.baseImponible);
        setIfPresent(normalized, 'iva', movement.iva);

        return normalized;
    });
};

const mapInvoice = (output: {
    numeroFactura?: string | null | undefined;
    fechaOperacion?: string | null | undefined;
    fechaVencimiento?: string | null | undefined;
    baseImponible?: number | null | undefined;
    iva?: number | null | undefined;
    total?: number | null | undefined;
    movements?:
        | Array<{
              concepto: string;
              cantidad: number;
              precio: number;
              baseImponible?: number | null | undefined;
              iva?: number | null | undefined;
              total: number;
          }>
        | null
        | undefined;
}): InvoiceExtractionPromptOutput['invoice'] => {
    const invoice: InvoiceExtractionPromptOutput['invoice'] = {};
    setIfPresent(invoice, 'numeroFactura', output.numeroFactura);
    setIfPresent(invoice, 'fechaOperacion', output.fechaOperacion);
    setIfPresent(invoice, 'fechaVencimiento', output.fechaVencimiento);
    setIfPresent(invoice, 'baseImponible', output.baseImponible);
    setIfPresent(invoice, 'iva', output.iva);
    setIfPresent(invoice, 'total', output.total);
    const movements = mapMovements(output.movements);
    if (movements) {
        invoice.movements = movements;
    }
    return invoice;
};

const mapProvider = (
    provider:
        | {
              razonSocial?: string | null | undefined;
              cif?: string | null | undefined;
              direccion?: string | null | undefined;
              poblacion?: string | null | undefined;
              provincia?: string | null | undefined;
              pais?: string | null | undefined;
          }
        | null,
): InvoiceExtractionPromptOutput['provider'] | undefined => {
    if (!isPresent(provider)) {
        return undefined;
    }

    const mapped: InvoiceExtractionPromptOutput['provider'] = {};
    setIfPresent(mapped, 'razonSocial', provider.razonSocial);
    setIfPresent(mapped, 'cif', provider.cif);
    setIfPresent(mapped, 'direccion', provider.direccion);
    setIfPresent(mapped, 'poblacion', provider.poblacion);
    setIfPresent(mapped, 'provincia', provider.provincia);
    setIfPresent(mapped, 'pais', provider.pais);

    return Object.keys(mapped).length > 0 ? mapped : undefined;
};
