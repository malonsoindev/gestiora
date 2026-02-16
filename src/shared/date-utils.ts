export const toDate = (value: unknown): Date => {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'number') {
        return new Date(value);
    }
    return new Date(String(value));
};

export const addSeconds = (date: Date, seconds: number): Date =>
    new Date(date.getTime() + seconds * 1000);
