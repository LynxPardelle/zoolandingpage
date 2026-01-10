import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class InteractiveProcessStoreService {
    readonly currentStep = signal<number>(0);

    setStep(step: number): void {
        this.currentStep.set(step);
    }
}
