import type { SearchFilters } from '@application/services/search-filter-detector.service.js';

const MONTH_NAMES = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'setiembre',
    'octubre',
    'noviembre',
    'diciembre',
];

export class SearchAmbiguityDetector {
    isAmbiguous(query: string, filters: SearchFilters): boolean {
        return (
            this.hasMonthWithoutYear(query) ||
            this.hasRelativeDate(query) ||
            this.hasVagueAmount(query, filters)
        );
    }

    private hasMonthWithoutYear(query: string): boolean {
        const hasMonth = MONTH_NAMES.some((month) => query.includes(month));
        const hasYear = /\b\d{4}\b/.test(query);
        return hasMonth && !hasYear;
    }

    private hasRelativeDate(query: string): boolean {
        return /\b(este mes|mes pasado|mes anterior|reciente|recientes|ultimos|últimos)\b/.test(query);
    }

    private hasVagueAmount(query: string, filters: SearchFilters): boolean {
        if (filters.minTotal !== undefined || filters.maxTotal !== undefined) {
            return false;
        }
        return /\b(alto|bajo|grande|pequeñ[oa]|caro|barato)\b/.test(query) &&
            /\b(importe|total|factura)\b/.test(query);
    }
}
