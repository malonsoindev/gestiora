import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { LogoutUseCase } from '../../../core/application/auth/logout.use-case';
import { SessionService } from '../../../core/application/auth/session.service';

const BREAKPOINT_FULL = '(min-width: 1024px)';
const BREAKPOINT_COMPACT = '(min-width: 600px)';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit, OnDestroy {
  private readonly logoutUseCase = inject(LogoutUseCase);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly bpSubscription = new Subscription();

  readonly isLoggingOut = signal(false);

  /** true when viewport >= 1024px (full sidenav with labels) */
  readonly isFull = signal(true);
  /** true when viewport >= 600px but < 1024px (compact: icons only) */
  readonly isCompact = signal(false);
  /** true when viewport < 600px (mobile: sidenav hidden, hamburger shown) */
  readonly isMobile = signal(false);

  /** Whether the sidenav is currently open (controlled in mobile mode) */
  readonly sidenavOpened = signal(true);

  readonly sidenavMode = computed(() => (this.isMobile() ? 'over' : 'side'));

  ngOnInit(): void {
    this.bpSubscription.add(
      this.breakpointObserver
        .observe([BREAKPOINT_FULL, BREAKPOINT_COMPACT])
        .subscribe(({ breakpoints }) => {
          const full = breakpoints[BREAKPOINT_FULL];
          const compact = breakpoints[BREAKPOINT_COMPACT];
          this.isFull.set(full);
          this.isCompact.set(!full && compact);
          this.isMobile.set(!compact);
          // Auto-open on desktop/compact, auto-close on mobile
          this.sidenavOpened.set(compact);
        }),
    );
  }

  ngOnDestroy(): void {
    this.bpSubscription.unsubscribe();
  }

  toggleSidenav(): void {
    this.sidenavOpened.set(!this.sidenavOpened());
  }

  onLogout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);

    this.logoutUseCase.execute().subscribe({
      next: () => this.navigateToLogin(),
      error: () => {
        // Logout must never block the user: clear session and redirect regardless
        this.session.clearSession();
        this.navigateToLogin();
      },
    });
  }

  private navigateToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
