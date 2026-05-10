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
});
