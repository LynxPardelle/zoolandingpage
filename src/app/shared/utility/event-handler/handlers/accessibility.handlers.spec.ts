import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { focusElementByIdHandler } from './accessibility.handlers';

describe('focusElementByIdHandler', () => {
    const context: EventExecutionContext = {
        event: { componentId: 'submit', eventName: 'clicked' },
        host: null,
    };

    afterEach(() => TestBed.resetTestingModule());

    it('defers focus and nearest scrolling when every predicate pair is strictly equal', async () => {
        const doc = document.implementation.createHTMLDocument('focus');
        const target = doc.createElement('section');
        target.id = 'calculator-result';
        target.tabIndex = -1;
        doc.body.appendChild(target);
        const focus = spyOn(target, 'focus');
        const scrollIntoView = jasmine.createSpy('scrollIntoView');
        Object.defineProperty(target, 'scrollIntoView', { configurable: true, value: scrollIntoView });
        TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
        const handler = TestBed.runInInjectionContext(() => focusElementByIdHandler());

        handler.handle(context, ['calculator-result', true, true, 1, 1]);
        expect(focus).not.toHaveBeenCalled();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));

        expect(scrollIntoView).toHaveBeenCalledOnceWith({ behavior: 'auto', block: 'nearest' });
        expect(focus).toHaveBeenCalled();
    });

    it('does not schedule focus when a strict predicate pair differs', async () => {
        const doc = document.implementation.createHTMLDocument('focus');
        const target = doc.createElement('section');
        target.id = 'calculator-result';
        doc.body.appendChild(target);
        const focus = spyOn(target, 'focus');
        TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
        const handler = TestBed.runInInjectionContext(() => focusElementByIdHandler());

        handler.handle(context, ['calculator-result', true, false]);
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));

        expect(focus).not.toHaveBeenCalled();
    });

    it('is safe for missing targets in an SSR-compatible document', async () => {
        const ssrDocument = document.implementation.createHTMLDocument('ssr');
        TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: ssrDocument }] });
        const handler = TestBed.runInInjectionContext(() => focusElementByIdHandler());

        expect(() => handler.handle(context, ['missing'])).not.toThrow();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
    });
});
