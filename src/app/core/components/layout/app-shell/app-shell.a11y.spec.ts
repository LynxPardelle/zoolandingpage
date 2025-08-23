import { TestBed } from '@angular/core/testing';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { LandingPageComponent } from '../../../../landingpage/landing.page';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent a11y', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter(
          [{ path: '', component: LandingPageComponent, pathMatch: 'full' }],
          withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
        ),
      ],
    }).compileComponents();
  });

  it('skip link moves focus to main landmark', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const skip = root.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
    expect(skip).toBeTruthy();
    const main = root.querySelector('main#main-content') as HTMLElement;
    expect(main).toBeTruthy();
    // Simulate click on skip link
    skip.click();
    // Allow focus to apply
    await fixture.whenStable();
    expect(document.activeElement).toBe(main);
  });

  it('renders header/banner and primary navigation landmarks', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector('header[role="banner"]');
    expect(header).toBeTruthy();
    const primaryNav = root.querySelector('nav[aria-label="Primary"]');
    expect(primaryNav).toBeTruthy();
  });
});
