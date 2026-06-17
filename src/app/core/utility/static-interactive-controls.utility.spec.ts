import { hasStaticInteractiveControls } from './static-interactive-controls.utility';

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
