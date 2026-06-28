import { REQUEST } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericCardComponent } from './generic-card.component';

describe('GenericCardComponent', () => {
    const nativeHistoryReplaceState = History.prototype.replaceState;
    let fixture: ComponentFixture<GenericCardComponent>;
    let requestState: { url: string };

    const setBrowserUrl = (url: string): void => {
        nativeHistoryReplaceState.call(window.history, {}, '', url);
        requestState.url = new URL(url, window.location.origin).toString();
    };

    beforeEach(async () => {
        requestState = { url: '' };
        setBrowserUrl('/home?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es');
        await TestBed.configureTestingModule({
            imports: [GenericCardComponent],
            providers: [{ provide: REQUEST, useValue: requestState }],
        }).compileComponents();

        fixture = TestBed.createComponent(GenericCardComponent);
    });

    afterEach(() => {
        setBrowserUrl('/context.html');
    });

    it('renders optional feature image and outbound link metadata', () => {
        fixture.componentInstance.config = {
            variant: 'feature',
            title: 'Void Techno',
            description: '2018-09-07',
            imageSrc: 'https://resources.tidal.com/images/cover/640x640.jpg',
            imageAlt: 'Void Techno cover art',
            imageClasses: 'album-cover',
            href: 'https://tidal.com/browse/album/500',
            linkLabel: 'Open on TIDAL',
            linkEventInstructions: 'trackEvent:cta_click,cta,album-card,location,card',
            linkClasses: 'album-link',
            target: '_blank',
            rel: 'noopener noreferrer',
            classes: 'album-card',
        } as never;

        fixture.detectChanges();

        const image: HTMLImageElement | null = fixture.nativeElement.querySelector('img');
        const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');

        expect(image?.getAttribute('src')).toBe('https://resources.tidal.com/images/cover/640x640.jpg');
        expect(image?.getAttribute('alt')).toBe('Void Techno cover art');
        expect(image?.getAttribute('class')).toBe('album-cover');
        expect(link?.getAttribute('href')).toBe('https://tidal.com/browse/album/500');
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
        expect(link?.getAttribute('data-event-instructions')).toBe('trackEvent:cta_click,cta,album-card,location,card');
        expect(link?.textContent?.trim()).toBe('Open on TIDAL');
    });

    it('emits optional link analytics metadata without blocking navigation', () => {
        fixture.componentInstance.config = {
            variant: 'feature',
            title: 'WhatsApp',
            href: 'https://wa.me/525522699563',
            linkLabel: 'Open WhatsApp',
            linkEventInstructions: 'trackEvent:whatsapp_click,cta,card,channel,whatsapp',
        } as never;
        const emitted: Array<{ href: string; eventInstructions?: string }> = [];
        fixture.componentInstance.linkClicked.subscribe((event) => emitted.push(event));

        fixture.detectChanges();
        fixture.componentInstance.onLinkClicked();

        expect(emitted).toEqual([
            {
                href: 'https://wa.me/525522699563',
                eventInstructions: 'trackEvent:whatsapp_click,cta,card,channel,whatsapp',
            },
        ]);
    });

    it('preserves draft query params on internal card links', () => {
        fixture.componentInstance.config = {
            variant: 'feature',
            title: 'Artículo',
            href: '/blog/web/qa-e2e',
            linkLabel: 'Leer artículo',
            target: '_blank',
        } as never;

        fixture.detectChanges();

        const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');

        expect(link?.getAttribute('href')).toBe('/blog/web/qa-e2e?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es');
        expect(link?.getAttribute('target')).toBeNull();
    });

    it('uses the request URL to preserve draft query params during SSR', () => {
        nativeHistoryReplaceState.call(window.history, {}, '', '/context.html');
        requestState.url = 'https://test.zoolandingpage.com.mx/blog?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es';
        fixture.componentInstance.config = {
            variant: 'feature',
            title: 'Artículo SSR',
            href: '/blog/web/qa-ssr',
            linkLabel: 'Leer artículo',
        } as never;

        fixture.detectChanges();

        const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');

        expect(link?.getAttribute('href')).toBe('/blog/web/qa-ssr?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es');
    });

    it('uses client-side navigation for internal card links', () => {
        fixture.componentInstance.config = {
            variant: 'feature',
            title: 'Artículo',
            href: '/blog/web/qa-e2e',
            linkLabel: 'Leer artículo',
        } as never;
        const pushState = spyOn(window.history, 'pushState').and.callThrough();
        const emitted: Array<{ href: string; eventInstructions?: string }> = [];
        fixture.componentInstance.linkClicked.subscribe((event) => emitted.push(event));

        fixture.detectChanges();
        fixture.nativeElement.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        expect(pushState).toHaveBeenCalledWith({}, '', '/blog/web/qa-e2e?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es');
        expect(emitted).toEqual([{
            href: '/blog/web/qa-e2e?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es',
            eventInstructions: undefined,
        }]);
    });

    it('renders generic card actions and emits their event instructions', () => {
        fixture.componentInstance.config = {
            variant: 'feature',
            title: 'Usuario',
            linkLabel: 'Grupos: zoosite-client',
            linkClasses: 'group-summary',
            actions: [
                {
                    label: 'Aprobar',
                    ariaLabel: 'Aprobar usuario',
                    eventInstructions: 'authAdminAction:approveUser,user-sub,zoosite-client,remoteStatus.adminUsersAction',
                    classes: 'approve-button',
                    icon: 'check_circle',
                    iconClasses: 'action-icon',
                },
                {
                    label: 'Suspender',
                    eventInstructions: 'authAdminAction:suspendUser,user-sub,,remoteStatus.adminUsersAction',
                    classes: 'suspend-button',
                    confirmMessage: 'Confirma que quieres suspender este usuario.',
                },
            ],
            actionListClasses: 'action-list',
        } as never;
        const emitted: Array<{ index: number; label: string; eventInstructions?: string }> = [];
        fixture.componentInstance.actionClicked.subscribe((event) => emitted.push(event));

        fixture.detectChanges();

        const actionList: HTMLElement | null = fixture.nativeElement.querySelector('.action-list');
        const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
        buttons[0]?.click();

        expect(actionList).not.toBeNull();
        expect(Array.from(buttons).map((button) => button.textContent?.trim())).toEqual(['Aprobar', 'Suspender']);
        expect(buttons[0]?.getAttribute('aria-label')).toBe('Aprobar usuario');
        expect(buttons[0]?.querySelector('.action-icon')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('a')).toBeNull();
        expect(fixture.nativeElement.querySelector('.group-summary')?.textContent?.trim()).toBe('Grupos: zoosite-client');
        expect(emitted).toEqual([
            {
                index: 0,
                label: 'Aprobar',
                eventInstructions: 'authAdminAction:approveUser,user-sub,zoosite-client,remoteStatus.adminUsersAction',
            },
        ]);
    });

    it('asks for confirmation before emitting dangerous generic card actions', () => {
        const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
        fixture.componentInstance.config = {
            variant: 'feature',
            title: 'Usuario',
            actions: [
                {
                    label: 'Suspender',
                    eventInstructions: 'authAdminAction:suspendUser,user-sub,,remoteStatus.adminUsersAction',
                    confirmMessage: 'Confirma que quieres suspender este usuario.',
                },
            ],
        } as never;
        const emitted: Array<{ index: number; label: string; eventInstructions?: string }> = [];
        fixture.componentInstance.actionClicked.subscribe((event) => emitted.push(event));

        fixture.detectChanges();
        fixture.nativeElement.querySelector('button')?.click();

        expect(confirmSpy).toHaveBeenCalledOnceWith('Confirma que quieres suspender este usuario.');
        expect(emitted).toEqual([]);
    });
});
