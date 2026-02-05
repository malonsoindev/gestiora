import type { CreateManualInvoiceRequest } from '../dto/create-manual-invoice.request.js';
import type { CreateManualInvoiceResponse } from '../dto/create-manual-invoice.response.js';
import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { InvoiceIdGenerator } from '../ports/invoice-id-generator.js';
import type { InvoiceMovementIdGenerator } from '../ports/invoice-movement-id-generator.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { ProviderRepository } from '../ports/provider.repository.js';
import type { PortError } from '../errors/port.error.js';
import { Invoice, InvoiceStatus } from '../../domain/entities/invoice.entity.js';
import { InvoiceMovement } from '../../domain/entities/invoice-movement.entity.js';
import type { Provider } from '../../domain/entities/provider.entity.js';
import { ProviderStatus } from '../../domain/entities/provider.entity.js';
import { InvalidCifError } from '../../domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '../../domain/errors/invalid-provider-status.error.js';
import { ProviderNotFoundError } from '../../domain/errors/provider-not-found.error.js';
import { Cif } from '../../domain/value-objects/cif.value-object.js';
import { InvoiceDate } from '../../domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type CreateManualInvoiceDependencies = {
    providerRepository: ProviderRepository;
    invoiceRepository: InvoiceRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    invoiceIdGenerator: InvoiceIdGenerator;
    invoiceMovementIdGenerator: InvoiceMovementIdGenerator;
};

export type CreateManualInvoiceError = InvalidProviderStatusError | InvalidCifError | ProviderNotFoundError | PortError;

export class CreateManualInvoiceUseCase {
    constructor(private readonly dependencies: CreateManualInvoiceDependencies) {}

    async execute(
        request: CreateManualInvoiceRequest,
    ): Promise<Result<CreateManualInvoiceResponse, CreateManualInvoiceError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const providerResult = await this.loadProvider(request);
        if (!providerResult.success) {
            return fail(providerResult.error);
        }
        const provider = providerResult.value;
        if (!provider) {
            return fail(new ProviderNotFoundError());
        }
        if (provider.status !== ProviderStatus.Active) {
            return fail(new InvalidProviderStatusError());
        }

        const invoice = Invoice.create({
            id: this.dependencies.invoiceIdGenerator.generate(),
            providerId: provider.id,
            status: InvoiceStatus.Draft,
            ...(request.invoice.numeroFactura ? { numeroFactura: request.invoice.numeroFactura } : {}),
            ...(request.invoice.fechaOperacion ? { fechaOperacion: InvoiceDate.create(request.invoice.fechaOperacion) } : {}),
            ...(request.invoice.fechaVencimiento ? { fechaVencimiento: InvoiceDate.create(request.invoice.fechaVencimiento) } : {}),
            ...(request.invoice.baseImponible === undefined ? {} : { baseImponible: Money.create(request.invoice.baseImponible) }),
            ...(request.invoice.iva === undefined ? {} : { iva: Money.create(request.invoice.iva) }),
            ...(request.invoice.total === undefined ? {} : { total: Money.create(request.invoice.total) }),
            movements: request.invoice.movements.map((movement) =>
                InvoiceMovement.create({
                    id: this.dependencies.invoiceMovementIdGenerator.generate(),
                    concepto: movement.concepto,
                    cantidad: movement.cantidad,
                    precio: movement.precio,
                    ...(movement.baseImponible === undefined ? {} : { baseImponible: movement.baseImponible }),
                    ...(movement.iva === undefined ? {} : { iva: movement.iva }),
                    total: movement.total,
                }),
            ),
            createdAt: now,
            updatedAt: now,
        });

        const createResult = await this.dependencies.invoiceRepository.create(invoice);
        if (!createResult.success) {
            return fail(createResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'INVOICE_MANUAL_CREATED',
            actorUserId: request.actorUserId,
            targetUserId: invoice.id,
            metadata: {
                providerId: invoice.providerId,
                numeroFactura: invoice.numeroFactura ?? null,
            },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({ invoiceId: invoice.id });
    }

    private async loadProvider(
        request: CreateManualInvoiceRequest,
    ): Promise<Result<Provider | null, InvalidCifError | PortError>> {
        if (request.providerId) {
            return this.dependencies.providerRepository.findById(request.providerId);
        }
        if (request.providerCif) {
            let cif: Cif;
            try {
                cif = Cif.create(request.providerCif);
            } catch (error) {
                if (error instanceof InvalidCifError) {
                    return fail(error);
                }
                throw error;
            }
            return this.dependencies.providerRepository.findByCif(cif.getValue());
        }
        return ok(null);
    }
}
