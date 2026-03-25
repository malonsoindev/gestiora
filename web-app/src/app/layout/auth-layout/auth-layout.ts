import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayoutComponent {
  readonly routeEntering = signal(false);
  private routeAnimationToken = 0;

  onRouteActivate(): void {
    this.routeAnimationToken += 1;
    const currentToken = this.routeAnimationToken;
    this.routeEntering.set(false);

    const run = () => {
      if (this.routeAnimationToken === currentToken) {
        this.routeEntering.set(true);
      }
    };

    this.deferToNextPaint(() => this.deferToNextPaint(run));
  }

  onRouteAnimationEnd(): void {
    this.routeEntering.set(false);
  }

  private deferToNextPaint(callback: () => void): void {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => callback());
      return;
    }

    setTimeout(() => callback(), 0);
  }
}
