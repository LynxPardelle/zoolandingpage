export type TEnvironment = {
    readonly production: boolean;
    readonly development: boolean;
    readonly apiUrl: string;
    readonly apiProxyUrl?: string;
    readonly apiProxyTestUrl?: string;
    readonly configApiUrl: string;
    readonly configApiRuntimeFallbackUrl?: string;
    readonly configApiServerFallbackUrl?: string;
    readonly configApiRuntimeFallbackUrls?: Partial<Record<'dev' | 'test' | 'production', string>>;
    readonly configApiServerFallbackUrls?: Partial<Record<'dev' | 'test' | 'production', string>>;
    readonly drafts: {
        readonly enabled: boolean;
        readonly basePath: string;
    };
};
