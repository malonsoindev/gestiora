import { normalizeText } from '@shared/text-utils.js';

export type SearchFilters = {
    providerName?: string;
    dateFrom?: string;
    dateTo?: string;
    minTotal?: number;
    maxTotal?: number;
};

type DateRange = {
    from?: string;
    to?: string;
};

export class SearchFilterDetector {
    /**
     * Heuristica simple para extraer filtros desde lenguaje natural.
     * Soporta fechas ISO, rangos basicos y expresiones de importe.
     */
    detect(query: string): SearchFilters {
        const normalized = normalizeText(query);
        const providerName = this.extractProviderName(normalized);
        const dateRange = this.extractDateRange(normalized);
        const amountRange = this.extractAmountRange(normalized);

        return this.buildFilters(providerName, dateRange, amountRange);
    }

    private extractProviderName(query: string): string | undefined {
        const match = /proveedor(?:es)?\s+([a-z0-9 .-]{2,})/i.exec(query);
        if (!match) {
            return undefined;
        }
        const value = match[1]?.trim() ?? '';
        return value.length > 0 ? value : undefined;
    }

    private extractDateRange(query: string): DateRange {
        const isoRange = this.extractIsoDateRange(query);
        if (isoRange) {
            return isoRange;
        }

        const monthRange = this.extractMonthRange(query);
        if (monthRange) {
            return monthRange;
        }

        return {};
    }

    private extractIsoDateRange(query: string): DateRange | undefined {
        const isoDates = query.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
        if (isoDates.length >= 2) {
            const from = isoDates[0];
            const to = isoDates[1];
            return {
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
            };
        }
        if (isoDates.length === 1) {
            const date = isoDates[0];
            if (date) {
                return { from: date, to: date };
            }
        }
        return undefined;
    }

    private extractMonthRange(query: string): DateRange | undefined {
        const isoMonths = query.match(/\b\d{4}-\d{2}\b/g) ?? [];
        if (isoMonths.length === 0) {
            return undefined;
        }

        const monthValue = isoMonths[0];
        if (!monthValue) {
            return undefined;
        }

        const [yearPart, monthPart] = monthValue.split('-');
        const year = yearPart ? Number(yearPart) : Number.NaN;
        const month = monthPart ? Number(monthPart) : Number.NaN;
        if (Number.isNaN(year) || Number.isNaN(month)) {
            return undefined;
        }

        const from = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${lastDay
            .toString()
            .padStart(2, '0')}`;
        return { from, to };
    }

    private extractAmountRange(query: string): { min?: number; max?: number } {
        const minMatch = /(?:>=|=>|mayor o igual que|al menos|mas de|más de)\s*(\d+(?:[.,]\d+)?)/i.exec(query);
        const maxMatch = /(?:<=|=<|menor o igual que|como maximo|como máximo|menos de)\s*(\d+(?:[.,]\d+)?)/i.exec(
            query,
        );

        const minValue = minMatch?.[1];
        const maxValue = maxMatch?.[1];
        const min = minValue ? this.toNumber(minValue) : undefined;
        const max = maxValue ? this.toNumber(maxValue) : undefined;

        if (min === undefined && max === undefined) {
            return {};
        }
        return { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
    }

    private toNumber(value: string): number | undefined {
        const normalized = value.replaceAll(',', '.');
        const parsed = Number.parseFloat(normalized);
        return Number.isNaN(parsed) ? undefined : parsed;
    }

    private buildFilters(providerName: string | undefined, dateRange: DateRange, amountRange: { min?: number; max?: number }) {
        const result: SearchFilters = {};

        if (providerName) {
            result.providerName = providerName;
        }
        if (dateRange.from !== undefined) {
            result.dateFrom = dateRange.from;
        }
        if (dateRange.to !== undefined) {
            result.dateTo = dateRange.to;
        }
        if (amountRange.min !== undefined) {
            result.minTotal = amountRange.min;
        }
        if (amountRange.max !== undefined) {
            result.maxTotal = amountRange.max;
        }

        return result;
    }
}
