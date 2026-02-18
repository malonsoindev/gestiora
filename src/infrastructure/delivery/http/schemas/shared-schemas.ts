// ============================================
// Shared Schema Building Blocks
// ============================================
// These constants reduce duplication across HTTP schemas.
// Use spread operator to compose responses: { ...error400, ...error401 }

// ============================================
// Error Responses
// ============================================

export const errorResponse = {
    type: 'object',
    required: ['error'],
    properties: {
        error: { type: 'string' },
    },
} as const;

export const errorResponseWithMessage = {
    type: 'object',
    required: ['error', 'message'],
    properties: {
        error: { type: 'string' },
        message: { type: 'string' },
    },
} as const;

// Spread-ready error response objects
export const error400 = { 400: errorResponse } as const;
export const error400WithMessage = { 400: errorResponseWithMessage } as const;
export const error401 = { 401: errorResponse } as const;
export const error403 = { 403: errorResponse } as const;
export const error404 = { 404: errorResponse } as const;
export const error429 = { 429: errorResponse } as const;

// ============================================
// Common Responses
// ============================================

export const response204 = { 204: { type: 'null' } } as const;

// ============================================
// Security
// ============================================

export const securityBearer = [{ bearerAuth: [] }] as const;

// ============================================
// Pagination
// ============================================

export const paginationQueryProperties = {
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1 },
} as const;

export const paginationResponseProperties = {
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
    total: { type: 'integer' },
} as const;

// ============================================
// Date Fields
// ============================================

export const dateTimeField = { type: 'string', format: 'date-time' } as const;
export const dateTimeNullableField = { type: 'string', format: 'date-time', nullable: true } as const;

// ============================================
// Invoice Enums
// ============================================

export const invoiceStatusEnum = { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INCONSISTENT', 'DELETED'] } as const;
export const dataSourceEnum = { type: 'string', enum: ['MANUAL', 'AI'] } as const;
export const headerStatusEnum = { type: 'string', enum: ['PROPOSED', 'CONFIRMED'] } as const;
export const movementStatusEnum = { type: 'string', enum: ['PROPOSED', 'CONFIRMED', 'REJECTED'] } as const;

// ============================================
// Provider Enums
// ============================================

export const providerStatusEnum = { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED', 'DRAFT'] } as const;

// ============================================
// User Enums
// ============================================

export const userStatusEnum = { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] } as const;
export const userRolesEnum = { type: 'string', enum: ['Usuario', 'Administrador'] } as const;
export const userRolesArray = { type: 'array', items: userRolesEnum } as const;
export const userRolesArrayMinOne = { type: 'array', minItems: 1, items: userRolesEnum } as const;

// ============================================
// Invoice Schemas
// ============================================

export const invoiceIdParams = {
    type: 'object',
    required: ['invoiceId'],
    properties: {
        invoiceId: { type: 'string' },
    },
} as const;

export const fileRefSchema = {
    type: 'object',
    required: ['storageKey', 'filename', 'mimeType', 'sizeBytes', 'checksum'],
    properties: {
        storageKey: { type: 'string' },
        filename: { type: 'string' },
        mimeType: { type: 'string' },
        sizeBytes: { type: 'integer' },
        checksum: { type: 'string' },
    },
} as const;

export const movementResponseSchema = {
    type: 'object',
    required: ['id', 'concepto', 'cantidad', 'precio', 'total', 'source', 'status'],
    properties: {
        id: { type: 'string' },
        concepto: { type: 'string' },
        cantidad: { type: 'number' },
        precio: { type: 'number' },
        baseImponible: { type: 'number' },
        iva: { type: 'number' },
        total: { type: 'number' },
        source: dataSourceEnum,
        status: movementStatusEnum,
    },
} as const;

export const movementInputSchema = {
    type: 'object',
    required: ['concepto', 'cantidad', 'precio', 'total'],
    additionalProperties: false,
    properties: {
        concepto: { type: 'string' },
        cantidad: { type: 'number' },
        precio: { type: 'number' },
        baseImponible: { type: 'number' },
        iva: { type: 'number' },
        total: { type: 'number' },
    },
} as const;

export const invoiceHeaderFields = {
    numeroFactura: { type: 'string' },
    fechaOperacion: { type: 'string' },
    fechaVencimiento: { type: 'string' },
    baseImponible: { type: 'number' },
    iva: { type: 'number' },
    total: { type: 'number' },
} as const;

export const invoiceDetailResponseProperties = {
    invoiceId: { type: 'string' },
    providerId: { type: 'string' },
    status: invoiceStatusEnum,
    fileRef: fileRefSchema,
    ...invoiceHeaderFields,
    headerSource: dataSourceEnum,
    headerStatus: headerStatusEnum,
    createdAt: dateTimeField,
    updatedAt: dateTimeField,
    deletedAt: dateTimeNullableField,
    movements: {
        type: 'array',
        items: movementResponseSchema,
    },
} as const;

export const invoiceDetailResponse = {
    type: 'object',
    required: ['invoiceId', 'providerId', 'status', 'createdAt', 'updatedAt', 'movements'],
    properties: invoiceDetailResponseProperties,
} as const;

export const invoiceDetailWithFileResponse = {
    type: 'object',
    required: ['invoiceId', 'providerId', 'status', 'fileRef', 'createdAt', 'updatedAt', 'movements'],
    properties: invoiceDetailResponseProperties,
} as const;

// ============================================
// Provider Schemas
// ============================================

export const providerIdParams = {
    type: 'object',
    required: ['providerId'],
    properties: {
        providerId: { type: 'string' },
    },
} as const;

export const providerDetailResponseProperties = {
    providerId: { type: 'string' },
    razonSocial: { type: 'string' },
    cif: { type: 'string' },
    direccion: { type: 'string' },
    poblacion: { type: 'string' },
    provincia: { type: 'string' },
    pais: { type: 'string' },
    status: providerStatusEnum,
    createdAt: dateTimeField,
    updatedAt: dateTimeField,
    deletedAt: dateTimeNullableField,
} as const;

export const providerDetailResponse = {
    type: 'object',
    required: ['providerId', 'razonSocial', 'status', 'createdAt', 'updatedAt'],
    properties: providerDetailResponseProperties,
} as const;

// ============================================
// User Schemas
// ============================================

export const userIdParams = {
    type: 'object',
    required: ['userId'],
    properties: {
        userId: { type: 'string' },
    },
} as const;

export const userDetailResponseProperties = {
    userId: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    avatar: { type: 'string' },
    status: userStatusEnum,
    roles: userRolesArray,
    createdAt: dateTimeField,
    updatedAt: dateTimeField,
    deletedAt: dateTimeNullableField,
} as const;

export const userDetailResponse = {
    type: 'object',
    required: ['userId', 'email', 'status', 'roles', 'createdAt', 'updatedAt'],
    properties: userDetailResponseProperties,
} as const;
