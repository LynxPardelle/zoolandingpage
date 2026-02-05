import { TestBed } from '@angular/core/testing';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter(
          [{ path: '', component: AppShellComponent, pathMatch: 'full' }],
          withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
        ),
      ],
    }).compileComponents();
  });

  it('should render main with id main-content and skip link', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main#main-content')).toBeTruthy();
    const skip = compiled.querySelector('a[href="#main-content"]');
    expect(skip).toBeTruthy();
    // Router-outlet should instantiate the app shell on root
    expect(compiled.querySelector('app-shell')).toBeTruthy();
  });
});
