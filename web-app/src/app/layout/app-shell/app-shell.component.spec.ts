import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
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

/** Creates a BreakpointObserver mock that emits a fixed breakpoint state */
function mockBreakpointObserver(full: boolean, compact: boolean) {
  const state: BreakpointState = {
    matches: full || compact,
    breakpoints: {
      '(min-width: 1024px)': full,
      '(min-width: 600px)': compact,
    },
  };
  return { observe: vi.fn().mockReturnValue(of(state)) };
}

function createTestBed(bpObserver = mockBreakpointObserver(true, true)): void {
  TestBed.configureTestingModule({
    imports: [AppShellComponent],
    providers: [
      provideAnimations(),
      provideRouter([
        { path: 'login', component: StubComponent },
        { path: 'dashboard', component: StubComponent },
        { path: 'providers', component: StubComponent },
        { path: 'invoices', component: StubComponent },
      ]),
      { provide: LogoutUseCase, useValue: mockLogoutUseCase },
      { provide: SessionService, useValue: mockSessionService },
      { provide: BreakpointObserver, useValue: bpObserver },
    ],
  });
}

describe('AppShellComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('full mode (>= 1024px)', () => {
    beforeEach(() => createTestBed(mockBreakpointObserver(true, true)));

    it('should create', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should start with isLoggingOut = false', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      expect(fixture.componentInstance.isLoggingOut()).toBe(false);
    });

    it('should render the app name "Gestiora" in the sidenav', () => {
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
      const hrefs = Array.from(links).map(
        (l) =>
          l.getAttribute('ng-reflect-router-link') ??
          l.getAttribute('href') ??
          (l as HTMLAnchorElement).pathname,
      );
      expect(hrefs.some((h) => h.includes('dashboard'))).toBe(true);
    });

    it('should render a navigation link to /providers', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const links = el.querySelectorAll('a[routerLink]');
      const hrefs = Array.from(links).map(
        (l) =>
          l.getAttribute('ng-reflect-router-link') ??
          l.getAttribute('href') ??
          (l as HTMLAnchorElement).pathname,
      );
      expect(hrefs.some((h) => h.includes('providers'))).toBe(true);
    });

    it('should render a navigation link to /invoices', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const links = el.querySelectorAll('a[routerLink]');
      const hrefs = Array.from(links).map(
        (l) =>
          l.getAttribute('ng-reflect-router-link') ??
          l.getAttribute('href') ??
          (l as HTMLAnchorElement).pathname,
      );
      expect(hrefs.some((h) => h.includes('invoices'))).toBe(true);
    });

    it('should render a logout button', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const btn = el.querySelector('mat-list-item.logout-item');
      expect(btn).toBeTruthy();
    });

    it('should be in full mode: isFull=true, isCompact=false, isMobile=false', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isFull()).toBe(true);
      expect(c.isCompact()).toBe(false);
      expect(c.isMobile()).toBe(false);
    });

    it('should not show mobile toolbar in full mode', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('mat-toolbar.mobile-toolbar')).toBeNull();
    });

    it('should show the collapse button in full mode', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('button.collapse-btn')).toBeTruthy();
    });

    it('should switch to compact when toggleCollapse is called', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isFull()).toBe(true);
      c.toggleCollapse();
      fixture.detectChanges();
      expect(c.isFull()).toBe(false);
      expect(c.isCompact()).toBe(true);
      expect(c.isCollapsed()).toBe(true);
    });

    it('should show expand button after collapsing', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      fixture.componentInstance.toggleCollapse();
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('button.expand-btn')).toBeTruthy();
      expect(el.querySelector('button.collapse-btn')).toBeNull();
    });

    it('should restore full mode when toggleCollapse is called again', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      c.toggleCollapse();
      c.toggleCollapse();
      fixture.detectChanges();
      expect(c.isFull()).toBe(true);
      expect(c.isCompact()).toBe(false);
    });
  });

  describe('compact mode (600px – 1023px)', () => {
    beforeEach(() => createTestBed(mockBreakpointObserver(false, true)));

    it('should be in compact mode: isFull=false, isCompact=true, isMobile=false', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isFull()).toBe(false);
      expect(c.isCompact()).toBe(true);
      expect(c.isMobile()).toBe(false);
    });

    it('should not show mobile toolbar in compact mode', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('mat-toolbar.mobile-toolbar')).toBeNull();
    });

    it('should keep sidenav opened in compact mode', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.sidenavOpened()).toBe(true);
    });

    it('should not show collapse or expand buttons when compact is forced by breakpoint', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('button.collapse-btn')).toBeNull();
      expect(el.querySelector('button.expand-btn')).toBeNull();
    });
  });

  describe('mobile mode (< 600px)', () => {
    beforeEach(() => createTestBed(mockBreakpointObserver(false, false)));

    it('should be in mobile mode: isFull=false, isCompact=false, isMobile=true', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isFull()).toBe(false);
      expect(c.isCompact()).toBe(false);
      expect(c.isMobile()).toBe(true);
    });

    it('should show the mobile toolbar with hamburger button', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('mat-toolbar.mobile-toolbar')).toBeTruthy();
    });

    it('should close sidenav by default in mobile mode', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.sidenavOpened()).toBe(false);
    });

    it('should toggle sidenav open when toggleSidenav is called', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.sidenavOpened()).toBe(false);
      fixture.componentInstance.toggleSidenav();
      expect(fixture.componentInstance.sidenavOpened()).toBe(true);
    });

    it('should use mode=over in mobile mode', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.sidenavMode()).toBe('over');
    });

    it('should not show collapse or expand buttons in mobile mode', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('button.collapse-btn')).toBeNull();
      expect(el.querySelector('button.expand-btn')).toBeNull();
    });

    it('should close sidenav after navigation in mobile mode', async () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      const router = TestBed.inject(Router);
      // Open sidenav first
      c.toggleSidenav();
      expect(c.sidenavOpened()).toBe(true);
      // Navigate
      await router.navigate(['/dashboard']);
      fixture.detectChanges();
      expect(c.sidenavOpened()).toBe(false);
    });
  });

  describe('onLogout', () => {
    beforeEach(() => createTestBed());

    it('should call logoutUseCase.execute when not already logging out', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.onLogout();
      expect(mockLogoutUseCase.execute).toHaveBeenCalledOnce();
    });

    it('should not call logoutUseCase.execute a second time if already logging out', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.onLogout();
      fixture.componentInstance.onLogout();
      expect(mockLogoutUseCase.execute).toHaveBeenCalledOnce();
    });

    it('should navigate to /login on successful logout', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockLogoutUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.onLogout();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should clear session and navigate to /login even when logout fails', () => {
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockLogoutUseCase.execute.mockReturnValue(throwError(() => new Error('network error')));
      fixture.componentInstance.onLogout();
      expect(mockSessionService.clearSession).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });
});
