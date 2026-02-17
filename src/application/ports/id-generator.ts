/**
 * Interfaz para generadores de identificadores unicos.
 * Cada entidad del dominio usa su propio adaptador que implementa esta interfaz.
 */
export interface IdGenerator {
    generate(): string;
}
