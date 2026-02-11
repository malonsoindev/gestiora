import type { Invoice } from '../../domain/entities/invoice.entity.js';
import type { Provider } from '../../domain/entities/provider.entity.js';

export type IndexInvoicesForRagRequest = {
    rows: Array<{ invoice: Invoice; provider: Provider | null }>;
};
