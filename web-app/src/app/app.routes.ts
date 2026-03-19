import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

@Component({
  selector: 'app-dashboard-placeholder',
  standalone: true,
  template: '<h1>Dashboard</h1>',
})
class DashboardPlaceholderComponent {}

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./modules/auth/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    component: DashboardPlaceholderComponent,
  },
  { path: '**', redirectTo: 'login' },
];
