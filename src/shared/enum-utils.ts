/**
 * Maps a string value to an enum member.
 * Returns the matching enum value if found, otherwise returns the default value.
 *
 * @param enumObj - The enum object containing all possible values
 * @param value - The string value to map
 * @param defaultValue - The default enum value to return if no match is found
 * @returns The matched enum value or the default value
 */
export function mapEnumValue<T extends Record<string, string>>(
    enumObj: T,
    value: string,
    defaultValue: T[keyof T],
): T[keyof T] {
    const enumValues = Object.values(enumObj) as T[keyof T][];
    const found = enumValues.find((v) => v === value);
    return found ?? defaultValue;
}
