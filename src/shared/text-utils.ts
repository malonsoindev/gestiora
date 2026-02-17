/**
 * Normaliza un texto: trim, lowercase y colapsa espacios múltiples.
 */
export const normalizeText = (value: string): string =>
    value.trim().toLowerCase().replaceAll(/\s+/g, ' ');

export const toText = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return JSON.stringify(value);
};
