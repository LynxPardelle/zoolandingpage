export type TComponentChild =
    | string
    | {
        readonly id: string;
        readonly type: string;
        readonly config?: unknown;
    };
