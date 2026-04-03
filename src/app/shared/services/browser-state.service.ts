import { DestroyRef, Injectable, signal } from '@angular/core';

export type TBrowserRuntimeState = {
    readonly viewport: {
        readonly width: number;
        readonly height: number;
        readonly scrollX: number;
        readonly scrollY: number;
    };
    readonly document: {
        readonly scrollHeight: number;
        readonly clientHeight: number;
    };
};

const DEFAULT_BROWSER_RUNTIME_STATE: TBrowserRuntimeState = {
    viewport: {
        width: 0,
        height: 0,
        scrollX: 0,
        scrollY: 0,
    },
    document: {
        scrollHeight: 0,
        clientHeight: 0,
    },
};

@Injectable({ providedIn: 'root' })
export class BrowserStateService {
    private readonly state = signal<TBrowserRuntimeState>(DEFAULT_BROWSER_RUNTIME_STATE);
    private activeDocument: Document | null = null;
    private teardown: (() => void) | null = null;

    snapshot(): TBrowserRuntimeState {
        return this.state();
    }

    connect(options: { document: Document | null | undefined; destroyRef: DestroyRef }): void {
        const doc = options.document ?? null;
        const win = doc?.defaultView ?? null;

        if (!doc || !win) {
            return;
        }

        if (this.activeDocument === doc && this.teardown) {
            return;
        }

        this.teardown?.();
        this.activeDocument = doc;

        const update = () => {
            const scrollingElement = doc.scrollingElement ?? doc.documentElement ?? doc.body;

            this.state.set({
                viewport: {
                    width: win.innerWidth || 0,
                    height: win.innerHeight || 0,
                    scrollX: Math.max(
                        win.scrollX || 0,
                        win.pageXOffset || 0,
                        scrollingElement?.scrollLeft || 0,
                        doc.documentElement?.scrollLeft || 0,
                        doc.body?.scrollLeft || 0,
                    ),
                    scrollY: Math.max(
                        win.scrollY || 0,
                        win.pageYOffset || 0,
                        scrollingElement?.scrollTop || 0,
                        doc.documentElement?.scrollTop || 0,
                        doc.body?.scrollTop || 0,
                    ),
                },
                document: {
                    scrollHeight: Math.max(
                        doc.documentElement?.scrollHeight || 0,
                        doc.body?.scrollHeight || 0,
                        scrollingElement?.scrollHeight || 0,
                    ),
                    clientHeight: Math.max(
                        doc.documentElement?.clientHeight || 0,
                        doc.body?.clientHeight || 0,
                        scrollingElement?.clientHeight || 0,
                    ),
                },
            });
        };

        const scrollTargets: Array<Window | Document | Element> = [win, doc];
        if (doc.scrollingElement) scrollTargets.push(doc.scrollingElement);
        if (doc.documentElement) scrollTargets.push(doc.documentElement);
        if (doc.body) scrollTargets.push(doc.body);

        const uniqueTargets = scrollTargets.filter((entry, index, all) => all.indexOf(entry) === index);

        uniqueTargets.forEach((target) => {
            target.addEventListener('scroll', update, { passive: true });
        });
        win.addEventListener('resize', update, { passive: true });

        update();

        this.teardown = () => {
            uniqueTargets.forEach((target) => {
                target.removeEventListener('scroll', update);
            });
            win.removeEventListener('resize', update);
            this.activeDocument = null;
            this.teardown = null;
        };

        options.destroyRef.onDestroy(() => {
            this.teardown?.();
        });
    }
}
