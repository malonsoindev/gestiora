export const toDate = (value: unknown): Date => {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'number') {
        return new Date(value);
    }
    return new Date(String(value));
};
