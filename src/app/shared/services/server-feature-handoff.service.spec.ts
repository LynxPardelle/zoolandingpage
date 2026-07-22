import { TestBed } from '@angular/core/testing';
import {
    SERVER_FEATURE_BROWSER,
    ServerFeatureHandoffService,
    type TServerFeatureBrowser,
} from './server-feature-handoff.service';

describe('ServerFeatureHandoffService', () => {
    let browser: jasmine.SpyObj<TServerFeatureBrowser>;
    let service: ServerFeatureHandoffService;

    beforeEach(() => {
        browser = jasmine.createSpyObj<TServerFeatureBrowser>('ServerFeatureBrowser', ['currentUrl', 'replaceUrl', 'navigate']);
        TestBed.configureTestingModule({
            providers: [
                ServerFeatureHandoffService,
                { provide: SERVER_FEATURE_BROWSER, useValue: browser },
            ],
        });
        service = TestBed.inject(ServerFeatureHandoffService);
    });

    afterEach(() => TestBed.resetTestingModule());

    it('captures OAuth fields and removes all known Stripe OAuth metadata before returning them', () => {
        browser.currentUrl.and.returnValue(
            'https://test.zoolandingpage.com.mx/conectar?draftDomain=preview.example.test&state=opaque&code=single-use&scope=read_write&livemode=false&stripe_user_id=acct_must_not_survive&error_description=ignore-me&error_uri=https%3A%2F%2Fevil.example.test%2Fdetail&lang=es#done',
        );

        expect(service.captureStripeOnboardingReturn()).toEqual({ state: 'opaque', code: 'single-use' });
        expect(browser.replaceUrl).toHaveBeenCalledOnceWith('/conectar?draftDomain=preview.example.test&lang=es#done');
    });

    it('rejects onboarding returns without exactly one non-empty code or error after cleaning the URL', () => {
        browser.currentUrl.and.returnValue(
            'https://test.zoolandingpage.com.mx/conectar?draftDomain=preview.example.test&state=opaque&lang=es',
        );

        expect(() => service.captureStripeOnboardingReturn()).toThrowError(/secure redirect/i);
        expect(browser.replaceUrl).toHaveBeenCalledOnceWith('/conectar?draftDomain=preview.example.test&lang=es');
    });

    it('accepts only the backend OAuth error allowlist', () => {
        browser.currentUrl.and.returnValue(
            'https://test.zoolandingpage.com.mx/conectar?state=opaque&error=access_denied',
        );
        expect(service.captureStripeOnboardingReturn()).toEqual({ state: 'opaque', error: 'access_denied' });

        browser.currentUrl.and.returnValue(
            'https://test.zoolandingpage.com.mx/conectar?state=opaque&error=provider_message',
        );
        expect(() => service.captureStripeOnboardingReturn()).toThrowError(/secure redirect/i);
    });

    it('rejects oversized or control-bearing OAuth values after cleaning the URL', () => {
        const cases = [
            new URLSearchParams({ state: 's'.repeat(1025), code: 'valid' }),
            new URLSearchParams({ state: 'valid', code: 'c'.repeat(1025) }),
            new URLSearchParams({ state: 'valid', code: 'line\nbreak' }),
        ];

        cases.forEach((query) => {
            browser.currentUrl.and.returnValue(`https://test.zoolandingpage.com.mx/conectar?${ query.toString() }&lang=es`);
            browser.replaceUrl.calls.reset();

            expect(() => service.captureStripeOnboardingReturn()).toThrowError(/secure redirect/i);
            expect(browser.replaceUrl).toHaveBeenCalledOnceWith('/conectar?lang=es');
        });
    });

    it('consumes HTTPS Stripe handoffs without returning data for VariableStore', () => {
        expect(service.consumeRedirect('openPortal', {
            redirectUrl: 'https://billing.stripe.com/p/session/test', expiresAt: Math.floor(Date.now() / 1000) + 300,
        })).toBeTrue();
        expect(browser.navigate).toHaveBeenCalledOnceWith('https://billing.stripe.com/p/session/test');
    });

    it('fails safely when a required handoff URL is missing, non-HTTPS, or outside Stripe', () => {
        expect(() => service.consumeRedirect('stripeOnboardingStart', {})).toThrowError(/secure redirect/i);
        expect(() => service.consumeRedirect('stripeOnboardingStart', { handoffUrl: 'http://connect.stripe.com/test' })).toThrowError(/secure redirect/i);
        expect(() => service.consumeRedirect('openPortal', { redirectUrl: 'https://evil.example.test/test' })).toThrowError(/secure redirect/i);
        expect(() => service.consumeRedirect('admitCheckout', {
            redirectUrl: 'https://user:pass@checkout.stripe.com/test', expiresAt: Math.floor(Date.now() / 1000) + 300,
        })).toThrowError(/secure redirect/i);
        expect(() => service.consumeRedirect('admitCheckout', {
            redirectUrl: 'https://checkout.stripe.com:444/test', expiresAt: Math.floor(Date.now() / 1000) + 300,
        })).toThrowError(/secure redirect/i);
        expect(() => service.consumeRedirect('admitCheckout', {
            redirectUrl: 'https://checkout.stripe.com/test', expiresAt: Math.floor(Date.now() / 1000) - 1,
        })).toThrowError(/secure redirect/i);
        expect(browser.navigate).not.toHaveBeenCalled();
    });

    it('consumes only the exact HTTPS Checkout host with a future expiry', () => {
        expect(service.consumeRedirect('admitCheckout', {
            redirectUrl: 'https://checkout.stripe.com/c/pay/test', expiresAt: Math.floor(Date.now() / 1000) + 300,
            fiscalAccessProof: 'must-never-be-persisted',
        })).toBeTrue();
        expect(browser.navigate).toHaveBeenCalledOnceWith('https://checkout.stripe.com/c/pay/test');
    });

    it('replaces native navigation failures with a closed error that does not reflect the handoff URL', () => {
        browser.navigate.and.throwError('native failure for https://checkout.stripe.com/c/pay/must-not-reflect');

        let message = '';
        try {
            service.consumeRedirect('admitCheckout', {
                redirectUrl: 'https://checkout.stripe.com/c/pay/must-not-reflect',
                expiresAt: Math.floor(Date.now() / 1000) + 300,
            });
        } catch (error) {
            message = error instanceof Error ? error.message : String(error);
        }

        expect(message).toMatch(/secure redirect/i);
        expect(message).not.toContain('stripe.com');
        expect(message).not.toContain('must-not-reflect');
    });
});
