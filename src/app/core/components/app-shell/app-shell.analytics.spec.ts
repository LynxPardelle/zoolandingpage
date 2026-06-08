import { AsyncPipe } from '@angular/common';
import { Component, Input, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { NgxAngoraService } from 'ngx-angora-css';
import { of } from 'rxjs';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { ConfigBootstrapService } from '../../../shared/services/config-bootstrap.service';
import { ConfigSourceService } from '../../../shared/services/config-source.service';
import { ConfigurationsOrchestratorService } from '../../../shared/services/configurations-orchestrator';
import { DraftRuntimeService } from '../../../shared/services/draft-runtime.service';
import { DraftRegistryService } from '../../../shared/services/draft-registry.service';
import type { TComponentPayloadEntry, TComponentsPayload } from '../../../shared/types/config-payloads.types';
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

const PRIMARY_DOMAIN = 'preview.example.test';
const draftPreviewUrl = `/?draftDomain=${ PRIMARY_DOMAIN }&draftPageId=default`;
const nativeHistoryReplaceState = History.prototype.replaceState;
const setBrowserUrl = (url: string): void => {
  nativeHistoryReplaceState.call(window.history, {}, '', url);
};

const createComponentsPayload = (components: Record<string, TComponentPayloadEntry>): TComponentsPayload => ({
  version: 1,
  pageId: 'default',
  domain: PRIMARY_DOMAIN,
  components: Object.values(components) as TComponentPayloadEntry[],
});

const ORCHESTRATOR_STUB = {
  modalHostConfig$: of(null),
  fallbackModalHostConfig: {},
  activeModalRef: () => null,
  getAllTheClassesFromComponents: () => ['ank-display-flex'],
  setDraftExportContext: () => { },
  setExternalComponentsFromPayload: () => { },
  setAuxiliaryComponentsFromPayload: () => { },
  exportDraftComponentsPayload: () => ({
    version: 1,
    pageId: 'default',
    domain: PRIMARY_DOMAIN,
    components: [],
  }),
};

const flushDeferredBootstrapWork = async (
  fixture: ComponentFixture<AppShellComponent>,
  done?: () => boolean,
): Promise<void> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    setBrowserUrl(draftPreviewUrl);
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    setBrowserUrl(draftPreviewUrl);
    fixture.detectChanges();
    if (done?.()) {
      return;
    }
  }
};

describe('AppShellComponent analytics', () => {
  const originalDevelopment = environment.development;
  const originalProduction = environment.production;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;
  let angoraSpy: jasmine.SpyObj<NgxAngoraService>;

  beforeEach(async () => {
    (environment as { development: boolean; production: boolean }).development = true;
    (environment as { development: boolean; production: boolean }).production = false;
    setBrowserUrl(draftPreviewUrl);
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36');
    spyOnProperty(navigator, 'webdriver', 'get').and.returnValue(false);
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', [
      'initializeRuntimeState',
      'track',
      'flush',
      'pageViewEventName',
      'promptForConsentIfNeeded',
      'startPageEngagementTracking',
      'stopPageEngagementTracking',
    ]);
    analyticsSpy.pageViewEventName.and.returnValue('page_view');
    angoraSpy = jasmine.createSpyObj<NgxAngoraService>('NgxAngoraService', [
      'cssCreate',
      'pushCombos',
      'pushColors',
      'runInCssCreateBatch',
      'updateClasses',
      'updateColors',
    ]);
    angoraSpy.runInCssCreateBatch.and.callFake((callback: () => void) => callback());
    angoraSpy.indicatorClass = 'ank';
    angoraSpy.abreviationsClasses = {};
    angoraSpy.timeBetweenReCreate = 300;
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: analyticsSpy },
        {
          provide: ConfigBootstrapService,
          useValue: {
            load: async () => ({
              domain: PRIMARY_DOMAIN,
              pageId: 'default',
              structuredDataApplied: true,
              pageConfig: {
                version: 1,
                pageId: 'default',
                domain: PRIMARY_DOMAIN,
                rootIds: ['skipToMainLink', 'siteHeader', 'landingPage'],
                modalRootIds: ['modalAnalyticsConsentRoot', 'modalTermsRoot', 'modalDataUseRoot'],
              },
              analytics: {
                version: 1,
                pageId: 'default',
                domain: PRIMARY_DOMAIN,
                sectionIds: ['home'],
                scrollMilestones: [25, 50, 75, 100],
              },
              components: createComponentsPayload({
                draftStub: {
                  id: 'draftStub',
                  type: 'text',
                  config: { text: '' },
                },
              }),
            }),
          },
        },
        {
          provide: DraftRegistryService,
          useValue: {
            listDrafts: () => of([{ domain: PRIMARY_DOMAIN, pageId: 'default' }]),
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
      ],
    }).compileComponents();

    TestBed.overrideComponent(AppShellComponent, {
      remove: { imports: [WrapperOrchestrator, DebugWorkspaceComponent] },
      add: { imports: [WrapperOrchestratorStub, DebugWorkspaceStub, AsyncPipe] },
    });

    const draftRuntime = TestBed.inject(DraftRuntimeService);
    spyOn(draftRuntime, 'resolveActiveDraftContext').and.resolveTo({
      domain: PRIMARY_DOMAIN,
      pageId: 'default',
      path: '/',
      route: null,
      explicitPageId: true,
    });
  });

  afterEach(() => {
    (environment as { development: boolean; production: boolean }).development = originalDevelopment;
    (environment as { development: boolean; production: boolean }).production = originalProduction;
    setBrowserUrl('/context.html');
    TestBed.resetTestingModule();
  });

  it('tracks the initial bootstrap page view once and records later navigations separately', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await flushDeferredBootstrapWork(fixture);

    let pageViews = analyticsSpy.track.calls.all().filter((call) => call.args[0] === 'page_view');
    expect(pageViews.length).toBe(1);

    analyticsSpy.track.calls.reset();
    setBrowserUrl('/?nav=1');
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    await Promise.resolve();

    expect(analyticsSpy.track).toHaveBeenCalled();
    pageViews = analyticsSpy.track.calls.all().filter((call) => call.args[0] === 'page_view');
    expect(pageViews.length).toBeGreaterThan(0);
  });

  it('delegates draft engagement observers to the analytics service', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await flushDeferredBootstrapWork(fixture, () => analyticsSpy.startPageEngagementTracking.calls.any());

    expect(analyticsSpy.startPageEngagementTracking).toHaveBeenCalled();
  });

  it('keeps the earliest pending cssCreate request instead of postponing it', () => {
    jasmine.clock().install();
    const fixture = TestBed.createComponent(AppShellComponent);
    try {
      const component = fixture.componentInstance;

      component.runtime.requestCssCreate(0);
      component.runtime.requestCssCreate(angoraSpy.timeBetweenReCreate + 150);
      jasmine.clock().tick(0);

      expect(angoraSpy.cssCreate).toHaveBeenCalledTimes(1);
    } finally {
      fixture.destroy();
      jasmine.clock().uninstall();
    }
  });

  it('continues requesting cssCreate after bootstrap through the runtime refresh API', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await flushDeferredBootstrapWork(fixture);

    angoraSpy.cssCreate.calls.reset();

    jasmine.clock().install();
    try {
      fixture.componentInstance.runtime.requestCssCreate();
      jasmine.clock().tick(0);

      expect(angoraSpy.cssCreate).toHaveBeenCalledTimes(1);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('requests cssCreate again after the dynamic roots render on initial bootstrap', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);

    fixture.detectChanges();
    await flushDeferredBootstrapWork(
      fixture,
      () => angoraSpy.cssCreate.calls.all().some((call) => Array.isArray(call.args[0])),
    );

    const explicitClassCalls = angoraSpy.cssCreate.calls
      .all()
      .filter((call) => Array.isArray(call.args[0]));

    expect(explicitClassCalls.length).toBeGreaterThan(0);
    expect((explicitClassCalls.at(-1)?.args[0] as string[]).length).toBeGreaterThan(0);
  });
});
