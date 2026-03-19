import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { LogoutUseCase } from '../../../core/application/auth/logout.use-case';
import { SessionService } from '../../../core/application/auth/session.service';

@Component({ standalone: true, template: '' })
class StubComponent {}

const mockLogoutUseCase = {
  execute: vi.fn(),
};

const mockSessionService = {
  clearSession: vi.fn(),
};

describe('DashboardComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([{ path: 'login', component: StubComponent }]),
        { provide: LogoutUseCase, useValue: mockLogoutUseCase },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start with isLoggingOut = false', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    expect(fixture.componentInstance.isLoggingOut()).toBe(false);
  });

  describe('onLogout', () => {
    it('should call logoutUseCase.execute when not already logging out', () => {
      const fixture = TestBed.createComponent(DashboardComponent);
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.onLogout();
      expect(mockLogoutUseCase.execute).toHaveBeenCalledOnce();
    });

    it('should not call logoutUseCase.execute a second time if already logging out', () => {
      const fixture = TestBed.createComponent(DashboardComponent);
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      // Force isLoggingOut to true
      fixture.componentInstance.onLogout();
      fixture.componentInstance.onLogout();
      expect(mockLogoutUseCase.execute).toHaveBeenCalledOnce();
    });

    it('should navigate to /login on successful logout', async () => {
      const fixture = TestBed.createComponent(DashboardComponent);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.onLogout();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should clear session and navigate to /login even when logout fails', async () => {
      const fixture = TestBed.createComponent(DashboardComponent);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockLogoutUseCase.execute.mockReturnValue(throwError(() => new Error('network error')));
      fixture.componentInstance.onLogout();
      expect(mockSessionService.clearSession).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });
});
