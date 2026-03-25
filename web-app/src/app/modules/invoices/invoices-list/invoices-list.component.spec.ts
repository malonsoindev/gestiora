import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';
import { InvoicesListComponent } from './invoices-list.component';
import { GetInvoicesUseCase } from '../../../../core/application/invoices/get-invoices.use-case';
import { GetInvoiceFileUseCase } from '../../../../core/application/invoices/get-invoice-file.use-case';
import { InvoiceListResponse } from '../../../../core/domain/invoices/invoice-list-params.model';

const mockListResponse: InvoiceListResponse = {
  items: [
    {
      invoiceId: 'inv-1',
      providerId: 'prov-1',
      status: 'DRAFT',
      createdAt: '2026-03-20T10:00:00.000Z',
    },
    {
      invoiceId: 'inv-2',
      providerId: 'prov-2',
      status: 'ACTIVE',
      createdAt: '2026-03-24T10:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

const mockGetInvoices = { execute: vi.fn() };
const mockGetInvoiceFile = { execute: vi.fn() };

describe('InvoicesListComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetInvoices.execute.mockReturnValue(of(mockListResponse));
    mockGetInvoiceFile.execute.mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));

    await TestBed.configureTestingModule({
      imports: [InvoicesListComponent],
      providers: [
        provideAnimations(),
        provideRouter([]),
        { provide: GetInvoicesUseCase, useValue: mockGetInvoices },
        { provide: GetInvoiceFileUseCase, useValue: mockGetInvoiceFile },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load invoices on init', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    expect(mockGetInvoices.execute).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.invoices()).toHaveLength(2);
  });

  it('should sort invoices by createdAt descending', () => {
    mockGetInvoices.execute.mockReturnValue(
      of({
        ...mockListResponse,
        items: [
          {
            invoiceId: 'inv-3',
            providerId: 'prov-3',
            status: 'ACTIVE',
            createdAt: 'invalid-date',
          },
          {
            invoiceId: 'inv-2',
            providerId: 'prov-2',
            status: 'ACTIVE',
            createdAt: '2026-03-24T10:00:00.000Z',
          },
          {
            invoiceId: 'inv-1',
            providerId: 'prov-1',
            status: 'DRAFT',
            createdAt: '2026-03-20T10:00:00.000Z',
          },
        ],
      }),
    );

    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.invoices().map((invoice) => invoice.invoiceId)).toEqual([
      'inv-2',
      'inv-1',
      'inv-3',
    ]);
  });

  it('should expose total count from the response', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.totalInvoices()).toBe(2);
  });

  it('should reload invoices with new page and pageSize', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    const pageEvent: PageEvent = {
      pageIndex: 2,
      pageSize: 25,
      length: 50,
      previousPageIndex: 1,
    };

    fixture.componentInstance.onPageChange(pageEvent);

    const lastCall = mockGetInvoices.execute.mock.calls.at(-1)?.[0] as {
      page: number;
      pageSize: number;
    };
    expect(lastCall.page).toBe(3);
    expect(lastCall.pageSize).toBe(25);
  });

  it('should filter visible invoices by search term', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSearchChange('prov-2');
    expect(fixture.componentInstance.visibleInvoices()).toHaveLength(1);
    expect(fixture.componentInstance.visibleInvoices()[0]?.invoiceId).toBe('inv-2');
  });

  it('should request invoice file and trigger download action', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    const invoice = fixture.componentInstance.invoices()[0];
    expect(invoice).toBeDefined();
    if (!invoice) {
      return;
    }

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    fixture.componentInstance.downloadInvoiceDocument(invoice);

    expect(mockGetInvoiceFile.execute).toHaveBeenCalledWith(invoice.invoiceId);
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('should navigate to new invoice route on create action', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.openCreateInvoice();

    expect(navigateSpy).toHaveBeenCalledWith(['/invoices/new']);
  });
});
