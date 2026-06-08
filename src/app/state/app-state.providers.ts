import { EnvironmentProviders } from '@angular/core';

export type TProvideAppStateOptions = {
    readonly production: boolean;
};

export function provideAppState(options: TProvideAppStateOptions): EnvironmentProviders[] {
    void options;
    return [];
}
