import { TestBed } from '@angular/core/testing';
import { NgxAngoraService } from 'ngx-angora-css';
import { AngoraCombosService } from './angora-combos.service';

describe('Angora numeric breakpoint CSS integration', () => {
    it('generates real min-width media rules for normalized utilities and combo tokens without changing defaults', () => {
        TestBed.configureTestingModule({ providers: [{ provide: NgxAngoraService, useClass: NgxAngoraService }] });
        const styles = ['angora-styles.css', 'angora-styles-responsive.css'].map(name => {
            const element = document.createElement('style');
            document.head.appendChild(element);
            Object.defineProperty(element.sheet, 'href', { value: name, configurable: true });
            return element;
        });
        try {
            const angora = TestBed.inject(NgxAngoraService);
            angora.changeUseTimerOption(false);
            angora.changeDebugOption(false);
            const defaults = angora.getBPS().map(({ bp, value }) => ({ bp, value }));
            const service = TestBed.inject(AngoraCombosService);
            service.setAuxiliaryCombos('numeric-breakpoint-test', {
                version: 1, pageId: 'page', domain: 'example.test',
                combos: { numericBreakpointCard: ['ank-display-px641-grid'] },
            });
            service.updateClasses(['numericBreakpointCard', 'ank-display-px561-flex', 'ank-width-px821-123px', 'ank-height-px901-47px']);
            const rules = Array.from(styles[1].sheet!.cssRules) as CSSMediaRule[];
            for (const [width, property, value] of [[561, 'display', 'flex'], [641, 'display', 'grid'], [821, 'width', '123px'], [901, 'height', '47px']] as const) {
                const rule = rules.find(entry => entry.conditionText?.includes(`min-width: ${width}px`)
                    && entry.cssText.includes(`${property}: ${value}`));
                expect(rule).withContext(`${width}px`).toBeDefined();
            }
            for (const original of defaults) {
                expect(angora.getBPS().find(entry => entry.bp === original.bp)?.value).toBe(original.value);
            }
            service.stopCssRuntime();
            service.clearAuxiliaryCombos('numeric-breakpoint-test');
        } finally {
            styles.forEach(element => element.remove());
        }
    });
});
