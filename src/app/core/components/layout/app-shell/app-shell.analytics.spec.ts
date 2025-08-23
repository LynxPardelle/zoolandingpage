import { TestBed } from '@angular/core/testing';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { LandingPageComponent } from '../../../../landingpage/landing.page';
import { AnalyticsService } from '../../../../shared/services/analytics.service';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent analytics', () => {
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', ['track', 'flush']);
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        { provide: AnalyticsService, useValue: analyticsSpy },
        provideRouter(
          [{ path: '', component: LandingPageComponent, pathMatch: 'full' }],
          withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
        ),
      ],
    }).compileComponents();
  });

  it('fires one page_view on initial navigation', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(analyticsSpy.track).toHaveBeenCalled();
    const calls = analyticsSpy.track.calls.all();
    // Filter for page_view
    const pageViews = calls.filter(c => c.args[0] === 'page_view');
    expect(pageViews.length).toBe(1);
  });
});
