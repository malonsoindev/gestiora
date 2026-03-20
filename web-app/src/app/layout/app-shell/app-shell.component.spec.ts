import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';
// provideAnimations is deprecated since Angular 20.2 (intent to remove v23).
// Angular Material 21 still requires ANIMATION_MODULE_TYPE. Keep until Material migrates.
// NOSONAR S1874
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppShellComponent } from './app-shell.component';
import { LogoutUseCase } from '../../../core/application/auth/logout.use-case';
import { SessionService } from '../../../core/application/auth/session.service';

@Component({ standalone: true, template: '' })
class StubComponent {}

const mockLogoutUseCase = {
  execute: vi.fn(),
};

const mockSessionService = {
  clearSession: vi.fn(),
  isAuthenticated: vi.fn().mockReturnValue(true),
};

describe('AppShellComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideAnimations(),
        provideRouter([
          { path: 'login', component: StubComponent },
          { path: 'dashboard', component: StubComponent },
          { path: 'providers', component: StubComponent },
        ]),
        { provide: LogoutUseCase, useValue: mockLogoutUseCase },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start with isLoggingOut = false', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    expect(fixture.componentInstance.isLoggingOut()).toBe(false);
  });

  it('should render the app name "Gestiora" in the toolbar', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Gestiora');
  });

  it('should render a navigation link to /dashboard', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const links = el.querySelectorAll('a[routerLink]');
    const hrefs = Array.from(links).map((l) => l.getAttribute('ng-reflect-router-link') ?? l.getAttribute('href') ?? (l as HTMLAnchorElement).pathname);
    expect(hrefs.some((h) => h.includes('dashboard'))).toBe(true);
  });

  it('should render a navigation link to /providers', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const links = el.querySelectorAll('a[routerLink]');
    const hrefs = Array.from(links).map((l) => l.getAttribute('ng-reflect-router-link') ?? l.getAttribute('href') ?? (l as HTMLAnchorElement).pathname);
    expect(hrefs.some((h) => h.includes('providers'))).toBe(true);
  });

  it('should render a logout button', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('mat-list-item.logout-item');
    expect(btn).toBeTruthy();
  });

  describe('onLogout', () => {
    it('should call logoutUseCase.execute when not already logging out', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.onLogout();
      expect(mockLogoutUseCase.execute).toHaveBeenCalledOnce();
    });

    it('should not call logoutUseCase.execute a second time if already logging out', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.onLogout();
      fixture.componentInstance.onLogout();
      expect(mockLogoutUseCase.execute).toHaveBeenCalledOnce();
    });

    it('should navigate to /login on successful logout', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.onLogout();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should clear session and navigate to /login even when logout fails', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockLogoutUseCase.execute.mockReturnValue(throwError(() => new Error('network error')));
      fixture.componentInstance.onLogout();
      expect(mockSessionService.clearSession).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });
});
