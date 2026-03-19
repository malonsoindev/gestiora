import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { guestGuard } from './guest.guard';
import { SessionService } from '../../../core/application/auth/session.service';

const mockSessionService = {
  isAuthenticated: vi.fn(),
};

describe('guestGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: mockSessionService },
      ],
    });
  });

  it('should return true when the user is NOT authenticated', () => {
    mockSessionService.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('should redirect to /dashboard when the user is already authenticated', () => {
    mockSessionService.isAuthenticated.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/dashboard']));
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });
});
