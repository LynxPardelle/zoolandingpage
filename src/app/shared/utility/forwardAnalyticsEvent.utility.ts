export type AnalyticsEventPayload = {
    readonly name: string;
    readonly category?: string;
    readonly label?: string;
    readonly value?: number;
    readonly meta?: any;
};

type AnalyticsLike = {
    suppress: (eventNames: readonly string[], untilMs: number) => void;
    track: (
        name: string,
        payload: {
            category?: string;
            label?: string;
            value?: number;
            meta?: any;
        },
    ) => unknown;
};

export function forwardAnalyticsEvent(analytics: AnalyticsLike, evt: AnalyticsEventPayload): void {
    if (!evt?.name) return;

    // Apply suppression hints.
    if (evt.label === 'suppress_request' && evt.meta?.suppressForMs && evt.meta?.intent) {
        const until = Date.now() + Number(evt.meta.suppressForMs || 0);
        analytics.suppress([evt.name], until); // re-use name; SectionView expected
        return; // do not forward suppression pseudo-event itself
    }

    void analytics.track(evt.name, {
        category: evt.category,
        label: evt.label,
        value: evt.value,
        meta: evt.meta,
    });
}
