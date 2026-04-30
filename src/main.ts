const CLIENT_BOOTSTRAP_DELAY_MS = 3000;

let bootstrapPromise: Promise<void> | null = null;
let bootstrapTimer: number | null = null;

function bootstrapClient(): Promise<void> {
    if (!bootstrapPromise) {
        bootstrapPromise = Promise.all([
            import('@angular/platform-browser'),
            import('./app/app.config'),
            import('./app/core/components/app-shell/app-shell.component'),
        ])
            .then(([platform, appConfigModule, appShellModule]) => platform.bootstrapApplication(
                appShellModule.AppShellComponent,
                appConfigModule.appConfig,
            ))
            .then(() => undefined)
            .catch((err) => {
                bootstrapPromise = null;
                console.error(err);
            });
    }

    return bootstrapPromise;
}

function clearBootstrapTimer(): void {
    if (bootstrapTimer !== null) {
        window.clearTimeout(bootstrapTimer);
        bootstrapTimer = null;
    }
}

function startBootstrap(): void {
    clearBootstrapTimer();
    window.removeEventListener('pointerdown', startBootstrap, true);
    window.removeEventListener('keydown', startBootstrap, true);
    window.removeEventListener('load', scheduleBootstrapAfterLoad);
    void bootstrapClient();
}

function scheduleBootstrapAfterLoad(): void {
    clearBootstrapTimer();
    bootstrapTimer = window.setTimeout(startBootstrap, CLIENT_BOOTSTRAP_DELAY_MS);
}

window.addEventListener('pointerdown', startBootstrap, { capture: true, once: true, passive: true });
window.addEventListener('keydown', startBootstrap, { capture: true, once: true });

if (document.readyState === 'complete') {
    scheduleBootstrapAfterLoad();
} else {
    window.addEventListener('load', scheduleBootstrapAfterLoad, { once: true });
}
