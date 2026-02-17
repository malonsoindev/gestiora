import { Cif } from '@domain/value-objects/cif.value-object.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { ok, fail, type Result } from '@shared/result.js';

/**
 * Safely creates a Cif value object from a string.
 * Returns undefined if the input is undefined or empty.
 *
 * @param value - The CIF string to validate and create
 * @returns Result with Cif or undefined on success, InvalidCifError on failure
 */
export function tryCif(value: string | undefined): Result<Cif | undefined, InvalidCifError> {
    if (!value) {
        return ok(undefined);
    }

    try {
        return ok(Cif.create(value));
    } catch (error) {
        if (error instanceof InvalidCifError) {
            return fail(error);
        }
        throw error;
    }
}
