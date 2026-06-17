import { CLIENT_BOOTSTRAP_DELAY_MS, CLIENT_BOOTSTRAP_READY_EVENT, STATIC_BOOT_CURTAIN_FALLBACK_MS } from './app/core/constants/client-bootstrap.constants';
import { hasReadableCriticalTextContrast } from './app/core/utility/critical-text-contrast.utility';
import { hasStaticInteractiveControls } from './app/core/utility/static-interactive-controls.utility';
import { hasStaticStyleCoverage } from './app/core/utility/static-style-coverage.utility';
import { environment } from './environments/environment';

const BOOT_CURTAIN_ID = 'zlp-boot-curtain';
const BOOT_CURTAIN_EXIT_CLASS = 'zlp-boot-curtain--leaving';
const BOOT_CURTAIN_EXIT_DURATION_MS = 420;
let bootstrapPromise: Promise<void> | null = null;
let bootstrapTimer: number | null = null;
let bootCurtainTimer: number | null = null;
let bootCurtainFallbackTimer: number | null = null;

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

function clearBootCurtainFallbackTimer(): void {
    if (bootCurtainFallbackTimer !== null) {
        window.clearTimeout(bootCurtainFallbackTimer);
        bootCurtainFallbackTimer = null;
    }
}

function removeBootstrapStartListeners(): void {
    window.removeEventListener('pointerdown', startBootstrap, true);
    window.removeEventListener('keydown', startBootstrap, true);
    window.removeEventListener(CLIENT_BOOTSTRAP_READY_EVENT, scheduleBootstrapAfterDocumentReady);
}

function releaseBootCurtainForStaticSsrContent(options: { allowIncompleteCriticalStyles?: boolean } = {}): void {
    const curtain = document.getElementById(BOOT_CURTAIN_ID);
    if (!curtain || curtain.classList.contains(BOOT_CURTAIN_EXIT_CLASS)) {
        return;
    }

    const appRoot = document.querySelector('app-root');
    if (!appRoot || !String(appRoot.textContent ?? '').trim()) {
        return;
    }

    const allowIncompleteCriticalStyles = options.allowIncompleteCriticalStyles === true;

    if (!allowIncompleteCriticalStyles && !hasStaticStyleCoverage(appRoot)) {
        return;
    }

    if (!allowIncompleteCriticalStyles && !hasReadableCriticalTextContrast(appRoot, document)) {
        return;
    }

    curtain.classList.add(BOOT_CURTAIN_EXIT_CLASS);
    curtain.setAttribute('aria-busy', 'false');
    curtain.setAttribute('aria-hidden', 'true');

    if (bootCurtainTimer !== null) {
        window.clearTimeout(bootCurtainTimer);
    }

    clearBootCurtainFallbackTimer();

    bootCurtainTimer = window.setTimeout(() => {
        curtain.remove();
        bootCurtainTimer = null;
    }, BOOT_CURTAIN_EXIT_DURATION_MS);
}

function startBootstrap(): void {
    clearBootstrapTimer();
    removeBootstrapStartListeners();
    void bootstrapClient();
}

function scheduleBootstrapAfterDocumentReady(): void {
    clearBootstrapTimer();

    if (hasStaticInteractiveControls(document.querySelector('app-root'))) {
        removeBootstrapStartListeners();
        clearBootCurtainFallbackTimer();
        void bootstrapClient().then(() => {
            releaseBootCurtainForStaticSsrContent();
            clearBootCurtainFallbackTimer();
            bootCurtainFallbackTimer = window.setTimeout(() => {
                releaseBootCurtainForStaticSsrContent({ allowIncompleteCriticalStyles: true });
            }, STATIC_BOOT_CURTAIN_FALLBACK_MS);
        });
        return;
    }

    releaseBootCurtainForStaticSsrContent();
    clearBootCurtainFallbackTimer();
    bootCurtainFallbackTimer = window.setTimeout(() => {
        releaseBootCurtainForStaticSsrContent({ allowIncompleteCriticalStyles: true });
    }, STATIC_BOOT_CURTAIN_FALLBACK_MS);
    bootstrapTimer = window.setTimeout(startBootstrap, environment.production ? CLIENT_BOOTSTRAP_DELAY_MS : 0);
}

function hasBootstrapReadyEventFired(): boolean {
    if (CLIENT_BOOTSTRAP_READY_EVENT === 'load') {
        return document.readyState === 'complete';
    }

    return document.readyState !== 'loading';
}

window.addEventListener('pointerdown', startBootstrap, { capture: true, once: true, passive: true });
window.addEventListener('keydown', startBootstrap, { capture: true, once: true });

if (hasBootstrapReadyEventFired()) {
    scheduleBootstrapAfterDocumentReady();
} else {
    window.addEventListener(CLIENT_BOOTSTRAP_READY_EVENT, scheduleBootstrapAfterDocumentReady, { once: true });
}
