import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LogoutUseCase } from '../../../core/application/auth/logout.use-case';
import { SessionService } from '../../../core/application/auth/session.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
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
