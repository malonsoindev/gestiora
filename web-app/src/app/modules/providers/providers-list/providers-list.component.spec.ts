import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ProvidersListComponent } from './providers-list.component';
import { GetProvidersUseCase } from '../../../../core/application/providers/get-providers.use-case';
import { DeleteProviderUseCase } from '../../../../core/application/providers/delete-provider.use-case';
import { ProviderListResponse } from '../../../../core/domain/providers/provider-list-params.model';

const mockListResponse: ProviderListResponse = {
  items: [
    { providerId: 'p-1', razonSocial: 'Proveedor Uno', status: 'ACTIVE' },
    { providerId: 'p-2', razonSocial: 'Proveedor Dos', status: 'INACTIVE' },
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

const mockGetProviders = { execute: vi.fn() };
const mockDeleteProvider = { execute: vi.fn() };
const mockDialog = { open: vi.fn() };

describe('ProvidersListComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetProviders.execute.mockReturnValue(of(mockListResponse));

    await TestBed.configureTestingModule({
      imports: [ProvidersListComponent],
      providers: [
        // provideAnimations is deprecated since Angular 20.2 but required by Material CDK
        provideAnimations(),
        provideRouter([]),
        { provide: GetProvidersUseCase, useValue: mockGetProviders },
        { provide: DeleteProviderUseCase, useValue: mockDeleteProvider },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ProvidersListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load providers on init', () => {
    const fixture = TestBed.createComponent(ProvidersListComponent);
    fixture.detectChanges();
    expect(mockGetProviders.execute).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.providers()).toHaveLength(2);
  });

  it('should expose total count from the response', () => {
    const fixture = TestBed.createComponent(ProvidersListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.totalProviders()).toBe(2);
  });

  it('should set isLoading to false after providers are loaded', () => {
    const fixture = TestBed.createComponent(ProvidersListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('should sort providers by razonSocial ascending', () => {
    mockGetProviders.execute.mockReturnValue(
      of({
        ...mockListResponse,
        items: [
          { providerId: 'p-1', razonSocial: 'Proveedor Uno', status: 'ACTIVE' },
          { providerId: 'p-2', razonSocial: 'Proveedor Dos', status: 'INACTIVE' },
        ],
      }),
    );

    const fixture = TestBed.createComponent(ProvidersListComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.providers().map((p) => p.razonSocial)).toEqual([
      'Proveedor Dos',
      'Proveedor Uno',
    ]);
  });

  describe('refreshProviders', () => {
    it('should reload providers keeping current paging state', () => {
      const fixture = TestBed.createComponent(ProvidersListComponent);
      fixture.detectChanges();

      const initialCalls = mockGetProviders.execute.mock.calls.length;
      fixture.componentInstance.refreshProviders();

      expect(mockGetProviders.execute.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  describe('openCreateDialog', () => {
    it('should open ProviderFormDialog with null provider data', () => {
      const mockAfterClosed = { afterClosed: vi.fn(() => of(false)) };
      mockDialog.open.mockReturnValue(mockAfterClosed);

      const fixture = TestBed.createComponent(ProvidersListComponent);
      fixture.detectChanges();
      fixture.componentInstance.openCreateDialog();

      expect(mockDialog.open).toHaveBeenCalledOnce();
      const callArgs = mockDialog.open.mock.calls[0] as unknown[];
      const data = (callArgs[1] as { data: { provider: null } }).data;
      expect(data.provider).toBeNull();
    });

    it('should reload providers after dialog closes with true', () => {
      mockGetProviders.execute.mockReturnValue(of(mockListResponse));
      const mockAfterClosed = { afterClosed: vi.fn(() => of(true)) };
      mockDialog.open.mockReturnValue(mockAfterClosed);

      const fixture = TestBed.createComponent(ProvidersListComponent);
      fixture.detectChanges();

      const initialCalls = mockGetProviders.execute.mock.calls.length;
      fixture.componentInstance.openCreateDialog();
      expect(mockGetProviders.execute.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  describe('openEditDialog', () => {
    it('should open ProviderFormDialog with the selected provider', () => {
      const mockAfterClosed = { afterClosed: vi.fn(() => of(false)) };
      mockDialog.open.mockReturnValue(mockAfterClosed);

      const fixture = TestBed.createComponent(ProvidersListComponent);
      fixture.detectChanges();

      const provider = mockListResponse.items[0];
      fixture.componentInstance.openEditDialog(provider);

      expect(mockDialog.open).toHaveBeenCalledOnce();
      const callArgs = mockDialog.open.mock.calls[0] as unknown[];
      const data = (callArgs[1] as { data: { provider: typeof provider } }).data;
      expect(data.provider).toEqual(
        expect.objectContaining({
          providerId: provider.providerId,
          razonSocial: provider.razonSocial,
          status: provider.status,
        }),
      );
    });
  });

  describe('deleteProvider', () => {
    it('should open confirm dialog before deleting', () => {
      const mockAfterClosed = { afterClosed: vi.fn(() => of(false)) };
      mockDialog.open.mockReturnValue(mockAfterClosed);

      const fixture = TestBed.createComponent(ProvidersListComponent);
      fixture.detectChanges();

      fixture.componentInstance.deleteProvider('p-1', 'Proveedor Uno');
      expect(mockDialog.open).toHaveBeenCalledOnce();
      expect(mockDeleteProvider.execute).not.toHaveBeenCalled();
    });

    it('should call DeleteProviderUseCase when confirm dialog returns true', () => {
      mockDeleteProvider.execute.mockReturnValue(of(undefined));
      mockGetProviders.execute.mockReturnValue(of(mockListResponse));
      const mockAfterClosed = { afterClosed: vi.fn(() => of(true)) };
      mockDialog.open.mockReturnValue(mockAfterClosed);

      const fixture = TestBed.createComponent(ProvidersListComponent);
      fixture.detectChanges();

      fixture.componentInstance.deleteProvider('p-1', 'Proveedor Uno');
      expect(mockDeleteProvider.execute).toHaveBeenCalledWith('p-1');
    });

    it('should NOT call DeleteProviderUseCase when confirm dialog returns false', () => {
      const mockAfterClosed = { afterClosed: vi.fn(() => of(false)) };
      mockDialog.open.mockReturnValue(mockAfterClosed);

      const fixture = TestBed.createComponent(ProvidersListComponent);
      fixture.detectChanges();

      fixture.componentInstance.deleteProvider('p-1', 'Proveedor Uno');
      expect(mockDeleteProvider.execute).not.toHaveBeenCalled();
    });
  });
});
