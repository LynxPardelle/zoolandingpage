import { hasReadableCriticalTextContrast } from './critical-text-contrast.utility';

describe('hasReadableCriticalTextContrast', () => {
    let host: HTMLElement;
    let style: HTMLStyleElement;
    let originalBodyBackground: string;

    beforeEach(() => {
        host = document.createElement('main');
        style = document.createElement('style');
        originalBodyBackground = document.body.style.backgroundColor;
        document.body.style.backgroundColor = 'rgb(247, 239, 228)';
        document.head.appendChild(style);
        document.body.appendChild(host);
    });

    afterEach(() => {
        host.remove();
        style.remove();
        document.body.style.backgroundColor = originalBodyBackground;
    });

    it('returns true when there are no critical text elements', () => {
        host.innerHTML = '<section><h1 class="heroTitle">Plain content</h1></section>';

        expect(hasReadableCriticalTextContrast(host)).toBeTrue();
    });

    it('returns false while critical text is too close to the page background', () => {
        style.textContent = '.sectionTitle { color: rgb(255, 248, 230); }';
        host.innerHTML = '<h1 class="sectionTitle">Title</h1>';

        expect(hasReadableCriticalTextContrast(host)).toBeFalse();
    });

    it('returns true when critical text has readable contrast', () => {
        style.textContent = '.sectionTitle { color: rgb(32, 23, 18); }';
        host.innerHTML = '<h1 class="sectionTitle">Title</h1>';

        expect(hasReadableCriticalTextContrast(host)).toBeTrue();
    });

    it('ignores hidden critical text hooks', () => {
        style.textContent = '.sectionTitle { color: rgb(255, 248, 230); }';
        host.innerHTML = '<h1 class="sectionTitle" hidden>Hidden title</h1>';

        expect(hasReadableCriticalTextContrast(host)).toBeTrue();
    });
});
