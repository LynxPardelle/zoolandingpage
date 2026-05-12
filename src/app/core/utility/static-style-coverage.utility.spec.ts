import { hasStaticStyleCoverage } from './static-style-coverage.utility';

describe('hasStaticStyleCoverage', () => {
    let host: HTMLElement;
    let style: HTMLStyleElement;

    beforeEach(() => {
        host = document.createElement('main');
        style = document.createElement('style');
        document.head.appendChild(style);
        document.body.appendChild(host);
    });

    afterEach(() => {
        host.remove();
        style.remove();
    });

    it('returns true when the rendered root has no class-dependent content', () => {
        host.innerHTML = '<section><h1>Plain content</h1></section>';

        expect(hasStaticStyleCoverage(host)).toBeTrue();
    });

    it('returns false when a rendered semantic class has no static CSS rule', () => {
        host.innerHTML = '<section class="demoPage"><h1 class="heroTitle">Demo</h1></section>';
        style.textContent = '.demoPage { display: grid; }';

        expect(hasStaticStyleCoverage(host)).toBeFalse();
    });

    it('returns true when all rendered semantic and utility classes have static CSS rules', () => {
        host.innerHTML = '<section class="demoPage ank-d-grid"><h1 class="heroTitle">Demo</h1></section>';
        style.textContent = [
            '.demoPage { display: grid; }',
            '.heroTitle { font-size: 3rem; }',
            '.ank-d-grid { display: grid; }',
        ].join('\n');

        expect(hasStaticStyleCoverage(host)).toBeTrue();
    });

    it('ignores Angular and internal runtime classes', () => {
        host.innerHTML = '<section class="ng-star-inserted zlp-runtime-shell demoPage">Demo</section>';
        style.textContent = '.demoPage { display: grid; }';

        expect(hasStaticStyleCoverage(host)).toBeTrue();
    });
});
