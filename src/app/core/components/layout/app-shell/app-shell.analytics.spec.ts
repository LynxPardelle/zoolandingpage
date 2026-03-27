import { AsyncPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router, withInMemoryScrolling } from '@angular/router';
import { NgxAngoraService } from 'ngx-angora-css';
import { of } from 'rxjs';
import { WrapperOrchestrator } from '../../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { AnalyticsService } from '../../../../shared/services/analytics.service';
import { ConfigBootstrapService } from '../../../../shared/services/config-bootstrap.service';
import { ConfigSourceService } from '../../../../shared/services/config-source.service';
import { ConfigurationsOrchestratorService } from '../../../../shared/services/configurations-orchestrator';
import { DraftRegistryService } from '../../../../shared/services/draft-registry.service';
import { DebugWorkspaceComponent } from '../debug-workspace/debug-workspace.component';
import { AppShellComponent } from './app-shell.component';

@Component({
  selector: 'wrapper-orchestrator',
  standalone: true,
  template: `<main id="main-content"></main>`,
})
class WrapperOrchestratorStub {
  @Input() componentsIds: readonly unknown[] = [];
}

@Component({
  selector: 'debug-workspace',
  standalone: true,
  template: '',
})
class DebugWorkspaceStub { }

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

describe('AppShellComponent analytics', () => {
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;
  let angoraSpy: jasmine.SpyObj<NgxAngoraService>;

  beforeEach(async () => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', [
      'track',
      'flush',
      'promptForConsentIfNeeded',
      'startPageEngagementTracking',
      'stopPageEngagementTracking',
    ]);
    angoraSpy = jasmine.createSpyObj<NgxAngoraService>('NgxAngoraService', [
      'cssCreate',
      'pushCombos',
      'pushColors',
      'updateColors',
    ]);
    angoraSpy.timeBetweenReCreate = 300;
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
              pageConfig: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                rootIds: ['skipToMainLink', 'siteHeader', 'landingPage'],
                modalRootIds: ['modalAnalyticsConsentRoot', 'modalTermsRoot', 'modalDataUseRoot'],
              },
              analytics: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                sectionIds: ['home'],
                scrollMilestones: [25, 50, 75, 100],
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
        {
          provide: ConfigSourceService,
          useValue: {
            loadSiteConfig: async () => null,
          },
        },
        { provide: ConfigurationsOrchestratorService, useValue: ORCHESTRATOR_STUB },
        {
          provide: NgxAngoraService,
          useValue: angoraSpy,
        },
        provideRouter(
          [{ path: '', component: AppShellComponent, pathMatch: 'full' }],
          withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
        ),
      ],
    }).compileComponents();

    TestBed.overrideComponent(AppShellComponent, {
      remove: { imports: [WrapperOrchestrator, DebugWorkspaceComponent] },
      add: { imports: [WrapperOrchestratorStub, DebugWorkspaceStub, AsyncPipe] },
    });
  });

  it('fires one page_view on initial navigation', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?nav=1');

    expect(analyticsSpy.track).toHaveBeenCalled();
    const calls = analyticsSpy.track.calls.all();
    // Filter for page_view
    const pageViews = calls.filter(c => c.args[0] === 'page_view');
    expect(pageViews.length).toBe(1);
  });

  it('delegates draft engagement observers to the analytics service', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(analyticsSpy.startPageEngagementTracking).toHaveBeenCalled();
  });

  it('keeps the earliest pending cssCreate request instead of postponing it', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppShellComponent);
    const component = fixture.componentInstance as any;

    component.scheduleCssCreate(0);
    component.scheduleCssCreate(angoraSpy.timeBetweenReCreate + 150);
    tick();

    expect(angoraSpy.cssCreate).toHaveBeenCalledTimes(1);
  }));

  it('continues requesting cssCreate when the rendered subtree mutates after bootstrap', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    angoraSpy.cssCreate.calls.reset();

    const wrapper = fixture.nativeElement.querySelector('wrapper-orchestrator') as HTMLElement;
    const lateNode = document.createElement('div');
    lateNode.className = 'ank-display-flex';
    wrapper.appendChild(lateNode);
    tick();

    expect(angoraSpy.cssCreate).toHaveBeenCalledTimes(1);
  }));
});
