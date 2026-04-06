export type TEnvironment = {
    readonly production: boolean;
    readonly development: boolean;
    readonly apiUrl: string;
    readonly configApiUrl: string;
    readonly drafts: {
        readonly enabled: boolean;
        readonly basePath: string;
    };
};
