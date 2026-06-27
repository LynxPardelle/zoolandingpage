import {
  hasProtectedSsrShell,
  hasStaticInteractiveControls,
  hasStaticRenderableContent,
} from './static-interactive-controls.utility';

describe('hasStaticInteractiveControls', () => {
  it('detects SSR form controls that should hydrate before release', () => {
    const host = document.createElement('app-root');
    host.innerHTML = '<main><form><generic-input><input type="email" /></generic-input></form></main>';

    expect(hasStaticInteractiveControls(host)).toBeTrue();
  });

  it('ignores hidden inputs and non-form navigation content', () => {
    const host = document.createElement('app-root');
    host.innerHTML = `
      <main>
        <a href="/registro">Crear cuenta</a>
        <button type="button">Abrir menú</button>
        <input type="hidden" value="tracking" />
      </main>
    `;

    expect(hasStaticInteractiveControls(host)).toBeFalse();
  });

  it('does not mark a missing SSR shell as interactive', () => {
    expect(hasStaticInteractiveControls(null)).toBeFalse();
  });
});

describe('hasStaticRenderableContent', () => {
  it('detects SSR content that can own the first paint before hydration', () => {
    const host = document.createElement('app-root');
    host.innerHTML = '<main><h1>Accede a tu cuenta</h1></main>';

    expect(hasStaticRenderableContent(host)).toBeTrue();
  });

  it('treats empty protected shells as needing immediate client bootstrap', () => {
    const host = document.createElement('app-root');
    host.innerHTML = '<!---->';

    expect(hasStaticRenderableContent(host)).toBeFalse();
  });

  it('treats a missing app root as needing immediate client bootstrap', () => {
    expect(hasStaticRenderableContent(null)).toBeFalse();
  });
});

describe('hasProtectedSsrShell', () => {
  it('detects SSR shells for protected draft routes', () => {
    const host = document.createElement('app-root');
    host.setAttribute('data-zlp-protected-shell', 'true');

    expect(hasProtectedSsrShell(host)).toBeTrue();
  });

  it('ignores normal public SSR shells', () => {
    const host = document.createElement('app-root');
    host.innerHTML = '<main><h1>Blog</h1></main>';

    expect(hasProtectedSsrShell(host)).toBeFalse();
  });
});
