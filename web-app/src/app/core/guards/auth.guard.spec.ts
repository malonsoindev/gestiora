import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { SessionService } from '../../../core/application/auth/session.service';

const mockSessionService = {
  isAuthenticated: vi.fn(),
};

describe('authGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: mockSessionService },
      ],
    });
  });

  it('should return true when the user is authenticated', () => {
    mockSessionService.isAuthenticated.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('should redirect to /login when the user is not authenticated', () => {
    mockSessionService.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/login']));
    expect((result as UrlTree).toString()).toBe('/login');
  });
});
