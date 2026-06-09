export type TAuthSessionStatus = 'anonymous' | 'restoring' | 'authenticating' | 'authenticated' | 'expired' | 'error';

export type TAuthProfile = {
    readonly subject: string;
    readonly displayName?: string;
    readonly email?: string;
    readonly roles?: readonly string[];
};

export type TAuthSessionState = {
    readonly status: TAuthSessionStatus;
    readonly profile: TAuthProfile | null;
    readonly provider: string | null;
    readonly expiresAtEpochMs: number | null;
    readonly error: string | null;
};

export type TStoredAuthSession = {
    readonly profile: TAuthProfile;
    readonly provider: string;
    readonly expiresAtEpochMs: number;
};
