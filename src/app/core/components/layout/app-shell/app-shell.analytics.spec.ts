import { AsyncPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withInMemoryScrolling } from '@angular/router';
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
  template: `<main id="main-content"></main>`,
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

describe('AppShellComponent analytics', () => {
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', ['track', 'flush', 'promptForConsentIfNeeded']);
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        { provide: AnalyticsService, useValue: analyticsSpy },
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

  it('fires one page_view on initial navigation', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');

    expect(analyticsSpy.track).toHaveBeenCalled();
    const calls = analyticsSpy.track.calls.all();
    // Filter for page_view
    const pageViews = calls.filter(c => c.args[0] === 'page_view');
    expect(pageViews.length).toBe(1);
  });
});
