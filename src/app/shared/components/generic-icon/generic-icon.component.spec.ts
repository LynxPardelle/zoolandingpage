import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericIconComponent } from './generic-icon.component';

describe('GenericIconComponent', () => {
  let component: GenericIconComponent;
  let fixture: ComponentFixture<GenericIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericIconComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericIconComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', { iconName: 'home', ariaHidden: true });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders add as the existing plus SVG without changing the accordion chevron', () => {
    for (const iconName of ['+', 'add']) {
      fixture.componentRef.setInput('config', { iconName, ariaHidden: true });
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg') as SVGElement | null;
      expect(svg?.querySelector('path')?.getAttribute('d')).toBe('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(fixture.nativeElement.textContent.trim()).toBe('');
    }
    fixture.componentRef.setInput('config', { iconName: 'expand_more', ariaHidden: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('path')?.getAttribute('d')).toBe('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z');
  });

  it('renders dynamic config values and aria-hidden', () => {
    fixture.componentRef.setInput('config', {
      iconName: () => 'search',
      title: () => 'Search site',
      classes: () => 'searchIcon',
      ariaHidden: () => true,
    } as never);
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('svg') as SVGElement;

    expect(icon.getAttribute('title')).toBe('Search site');
    expect(icon.getAttribute('aria-label')).toBe('Search site');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('class')).toContain('searchIcon');
    expect(icon.querySelector('path')?.getAttribute('d')).toBeTruthy();
  });

  it('prefers ariaLabel over title when both are provided', () => {
    fixture.componentRef.setInput('config', {
      iconName: 'home',
      title: 'Home title',
      ariaLabel: 'Home label',
    });
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('svg') as SVGElement;

    expect(icon.getAttribute('title')).toBe('Home title');
    expect(icon.getAttribute('aria-label')).toBe('Home label');
    expect(icon.getAttribute('aria-hidden')).toBeNull();
  });

  it('renders local theme icons as svg instead of material icon text', () => {
    fixture.componentRef.setInput('config', { iconName: 'dark_mode', ariaHidden: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
    expect(fixture.nativeElement.textContent.trim()).not.toContain('dark_mode');

    fixture.componentRef.setInput('config', { iconName: 'light_mode', ariaHidden: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
    expect(fixture.nativeElement.textContent.trim()).not.toContain('light_mode');
  });

  it('renders every authored icon found by fleet QA as local svg instead of leaking its name', () => {
    const iconNames = [
      '+',
      'account_balance',
      'account_balance_wallet',
      'ads_click',
      'apartment',
      'badge',
      'chat',
      'dashboard_customize',
      'description',
      'design_services',
      'edit_note',
      'flag',
      'flight_land',
      'forum',
      'help',
      'insights',
      'inventory_2',
      'lightbulb',
      'location_city',
      'manage_search',
      'medical_services',
      'monitoring',
      'payments',
      'photo_library',
      'place',
      'privacy_tip',
      'rule',
      'storefront',
      'title',
      'verified_user',
      'view_quilt',
      'work_off',
    ];

    for (const iconName of iconNames) {
      fixture.componentRef.setInput('config', { iconName, ariaHidden: true });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('svg'))
        .withContext(iconName)
        .toBeTruthy();
      const bounds = (
        fixture.nativeElement.querySelector('path') as SVGPathElement
      ).getBBox();
      expect(bounds.width).withContext(iconName).toBeGreaterThan(0);
      expect(bounds.height).withContext(iconName).toBeGreaterThan(0);
      expect(fixture.nativeElement.textContent.trim())
        .withContext(iconName)
        .not.toContain(iconName);
    }
  });
});
