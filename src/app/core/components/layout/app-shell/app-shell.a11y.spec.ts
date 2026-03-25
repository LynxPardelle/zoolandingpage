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
import { DraftRegistryService } from '../../../../shared/services/draft-registry.service';
import { AppShellComponent } from './app-shell.component';

@Component({
  selector: 'wrapper-orchestrator',
  standalone: true,
  template: `
    <a href="#main-content" (click)="focusMain($event, mainContent)">Skip to content</a>
    <header role="banner"></header>
    <nav aria-label="Primary"></nav>
    <main #mainContent id="main-content" tabindex="-1"></main>
  `,
})
class WrapperOrchestratorStub {
  @Input() componentsIds: readonly unknown[] = [];

  focusMain(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
  }
}

const ORCHESTRATOR_STUB = {
  modalHostConfig$: of(null),
  fallbackModalHostConfig: {},
  devDemoControlsComponents: [] as string[],
  getAllTheClassesFromComponents: () => [],
  setDraftExportContext: () => { },
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
          useValue: {
            track: async () => { },
            flush: () => [],
            promptForConsentIfNeeded: () => { },
            startPageEngagementTracking: () => { },
            stopPageEngagementTracking: () => { },
          } as any,
        },
        {
          provide: ConfigBootstrapService,
          useValue: {
            load: async () => ({
              domain: 'zoolandingpage.com.mx',
              pageId: 'default',
              structuredDataApplied: true,
              pageConfig: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                rootIds: ['skipToMainLink', 'siteHeader', 'landingPage'],
                modalRootIds: ['modalAnalyticsConsentRoot', 'modalTermsRoot', 'modalDataUseRoot'],
              },
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
        {
          provide: DraftRegistryService,
          useValue: {
            listDrafts: () => of([{ domain: 'zoolandingpage.com.mx', pageId: 'default' }]),
          },
        },
        { provide: ConfigurationsOrchestratorService, useValue: ORCHESTRATOR_STUB },
        {
          provide: NgxAngoraService,
          useValue: {
            cssCreate: () => { },
            timeBetweenReCreate: 0,
            pushCombos: () => { },
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
    const root = fixture.nativeElement as HTMLElement;
    const skip = root.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
    expect(skip).toBeTruthy();
    const main = root.querySelector('main#main-content') as HTMLElement;
    expect(main).toBeTruthy();

    skip.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
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
