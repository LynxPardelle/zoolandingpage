import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericLink } from './generic-link';

describe('GenericLink', () => {
  let component: GenericLink;
  let fixture: ComponentFixture<GenericLink>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericLink]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericLink);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', { id: 'spec', href: '#home', text: 'Home' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should serialize only string component tokens into the data attribute', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '#home',
      text: 'Home',
      components: [
        'nav-item',
        {
          id: 'nested-child',
          type: 'text',
          config: { text: 'Nested child' },
        } as any,
      ],
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.componentTokens()).toEqual(['nav-item']);
    expect(anchor.getAttribute('data-components')).toBe('nav-item');
  });
});
