import { routes } from './app.routes';
import { AppShellComponent } from './core/components/app-shell/app-shell.component';

describe('app routes', () => {
    it('keeps wildcard paths on the app shell instead of redirecting them away', () => {
        const wildcardRoute = routes.find((route) => route.path === '**');

        expect(wildcardRoute?.component).toBe(AppShellComponent);
        expect(wildcardRoute?.redirectTo).toBeUndefined();
    });
});
