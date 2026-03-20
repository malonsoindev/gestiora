import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LogoutUseCase } from '../../../core/application/auth/logout.use-case';
import { SessionService } from '../../../core/application/auth/session.service';

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
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly logoutUseCase = inject(LogoutUseCase);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly isLoggingOut = signal(false);

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
