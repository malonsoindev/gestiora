import { routes } from './app.routes';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

describe('app routes', () => {
  it('should include invoices route under authenticated shell', () => {
    const shellRoute = routes.find(
      (route) => route.path === '' && route.component === AppShellComponent,
    );
    const children = shellRoute?.children ?? [];
    const invoicesRoute = children.find((route) => route.path === 'invoices');

    expect(invoicesRoute).toBeTruthy();
    expect(invoicesRoute?.loadComponent).toBeTypeOf('function');
  });
});
