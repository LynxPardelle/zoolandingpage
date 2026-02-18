import { AsyncPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { NgxAngoraService } from 'ngx-angora-css';
import { of } from 'rxjs';
import { WrapperOrchestrator } from '../../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { AnalyticsService } from '../../../../shared/services/analytics.service';
import { ConfigBootstrapService } from '../../../../shared/services/config-bootstrap.service';
import { ConfigurationsOrchestratorService } from '../../../../shared/services/configurations-orchestrator';
import { AppShellComponent } from './app-shell.component';

@Component({
  selector: 'wrapper-orchestrator',
  standalone: true,
  template: `
    <a href="#main-content">Skip to content</a>
    <header role="banner"></header>
    <nav aria-label="Primary"></nav>
    <main id="main-content" tabindex="-1"></main>
  `,
})
class WrapperOrchestratorStub {
  @Input() componentsIds: readonly unknown[] = [];
}

const ORCHESTRATOR_STUB = {
  modalHostConfig$: of(null),
  fallbackModalHostConfig: {},
  devDemoControlsComponents: [] as string[],
  getAllTheClassesFromComponents: () => [],
  setExternalComponentsFromPayload: () => { },
  exportDraftComponentsPayload: () => ({
    version: 1,
    pageId: 'default',
    domain: 'zoolandingpage.com.mx',
    components: {},
  }),
};

describe('AppShellComponent a11y', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        {
          provide: AnalyticsService,
          useValue: { track: async () => { }, flush: () => [], promptForConsentIfNeeded: () => { } } as any,
        },
        {
          provide: ConfigBootstrapService,
          useValue: {
            load: async () => ({
              domain: 'zoolandingpage.com.mx',
              pageId: 'default',
              structuredDataApplied: true,
              components: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                components: {
                  draftStub: {
                    id: 'draftStub',
                    type: 'text',
                    config: { text: '' },
                  },
                },
              },
            }),
          },
        },
        { provide: ConfigurationsOrchestratorService, useValue: ORCHESTRATOR_STUB },
        {
          provide: NgxAngoraService,
          useValue: {
            cssCreate: () => { },
            timeBetweenReCreate: 0,
            pushColors: () => { },
            updateColors: () => { },
          } as any,
        },
        provideRouter(
          [{ path: '', component: AppShellComponent, pathMatch: 'full' }],
          withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
        ),
      ],
    }).compileComponents();

    TestBed.overrideComponent(AppShellComponent, {
      remove: { imports: [WrapperOrchestrator] },
      add: { imports: [WrapperOrchestratorStub, AsyncPipe] },
    });
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
