import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericCardComponent } from './generic-card.component';

describe('GenericCardComponent', () => {
    let fixture: ComponentFixture<GenericCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GenericCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GenericCardComponent);
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
        expect(link?.textContent?.trim()).toBe('Open on TIDAL');
    });
});
