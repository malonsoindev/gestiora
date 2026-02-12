import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';

export class Cif {
    private constructor(private readonly value: string) {}

    static create(raw: string): Cif {
        const normalized = Cif.normalize(raw);
        if (!Cif.isValid(normalized)) {
            throw new InvalidCifError();
        }
        return new Cif(normalized);
    }

    getValue(): string {
        return this.value;
    }

    private static normalize(raw: string): string {
        return raw.trim().toUpperCase().replaceAll('-', '').replaceAll(' ', '');
    }

    private static isValid(value: string): boolean {
        return /^[A-Z][A-Z\d]{7}\d$/.test(value);
    }
}
