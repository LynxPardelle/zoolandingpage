import { AsyncPipe } from '@angular/common';
import {
  Component,
  Input,
  PLATFORM_ID,
  REQUEST,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter, withInMemoryScrolling } from '@angular/router';
import { NgxAngoraService } from 'ngx-angora-css';
import { of } from 'rxjs';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { ConfigBootstrapService } from '../../../shared/services/config-bootstrap.service';
import { ConfigSourceService } from '../../../shared/services/config-source.service';
import { ConfigurationsOrchestratorService } from '../../../shared/services/configurations-orchestrator';
import { DraftRuntimeService } from '../../../shared/services/draft-runtime.service';
import { DraftRegistryService } from '../../../shared/services/draft-registry.service';
import type {
  TComponentPayloadEntry,
  TComponentsPayload,
} from '../../../shared/types/config-payloads.types';
import { initializeRuntimeConfig } from '../../../app.config';
import { DebugWorkspaceComponent } from '../debug-workspace/debug-workspace.component';
import { AppShellComponent } from './app-shell.component';

@Component({
  selector: 'wrapper-orchestrator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
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

@Component({
  selector: 'debug-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '',
})
class DebugWorkspaceStub {}

@Component({
  selector: 'route-target-stub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '',
})
class RouteTargetStub {}

const PRIMARY_DOMAIN = 'preview.example.test';
const SECONDARY_DOMAIN = 'music.example.test';
const LEGAL_DOMAIN = 'legal.example.test';
const DEBUG_MODAL_ROOT_IDS = ['modalDemoRoot'];
const draftPreviewUrl = (domain: string, pageId = 'default'): string =>
  `/?draftDomain=${domain}&draftPageId=${pageId}`;
const nativeHistoryReplaceState = History.prototype.replaceState;
const setBrowserUrl = (url: string): void => {
  nativeHistoryReplaceState.call(window.history, {}, '', url);
};

const flushDeferredBootstrapWork = async (
  fixture: ComponentFixture<AppShellComponent>,
  options: { readonly url?: string; readonly done?: () => boolean } = {}
): Promise<void> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (options.url) {
      setBrowserUrl(options.url);
    }

    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    if (options.url) {
      setBrowserUrl(options.url);
    }

    fixture.detectChanges();
    if (options.done?.()) {
      return;
    }
  }
};

const pinResolvedDraftContext = (
  domain: string,
  pageId = 'default',
  path = '/'
): void => {
  const draftRuntime = TestBed.inject(DraftRuntimeService);
  spyOn(draftRuntime, 'resolveActiveDraftContext').and.resolveTo({
    domain,
    pageId,
    path,
    route: null,
    explicitPageId: true,
  });
};

const createComponentsPayload = (
  components: Record<string, TComponentPayloadEntry>,
  overrides: Partial<{ domain: string; pageId: string }> = {}
): TComponentsPayload => ({
  version: 1,
  pageId: overrides.pageId ?? 'default',
  domain: overrides.domain ?? PRIMARY_DOMAIN,
  components: Object.values(components) as TComponentPayloadEntry[],
});

let bootstrapResult: any;
let bootstrapLoadArgs: Array<{
  domain?: string;
  pageId?: string;
  lang?: string;
}>;

const ORCHESTRATOR_STUB = {
  modalHostConfig$: of(null),
  fallbackModalHostConfig: {},
  activeModalRef: () => null,
  getAllTheClassesFromComponents: () => [],
  setDraftExportContext: jasmine.createSpy('setDraftExportContext'),
  setExternalComponentsFromPayload: jasmine.createSpy(
    'setExternalComponentsFromPayload'
  ),
  setAuxiliaryComponentsFromPayload: jasmine.createSpy(
    'setAuxiliaryComponentsFromPayload'
  ),
  exportDraftComponentsPayload: () => ({
    version: 1,
    pageId: 'default',
    domain: PRIMARY_DOMAIN,
    components: [],
  }),
};

describe('AppShellComponent', () => {
  beforeEach(async () => {
    setBrowserUrl(draftPreviewUrl(LEGAL_DOMAIN));
    bootstrapLoadArgs = [];
    bootstrapResult = {
      domain: PRIMARY_DOMAIN,
      pageId: 'default',
      structuredDataApplied: true,
      pageConfig: {
        version: 1,
        pageId: 'default',
        domain: PRIMARY_DOMAIN,
        rootIds: ['skipToMainLink', 'siteHeader', 'landingPage'],
        modalRootIds: [
          'modalAnalyticsConsentRoot',
          'modalTermsRoot',
          'modalDataUseRoot',
        ],
      },
      components: createComponentsPayload({
        draftStub: {
          id: 'draftStub',
          type: 'text',
          config: { text: '' },
        },
      }),
    };
    ORCHESTRATOR_STUB.setExternalComponentsFromPayload.calls.reset();
    ORCHESTRATOR_STUB.setAuxiliaryComponentsFromPayload.calls.reset();
    ORCHESTRATOR_STUB.setDraftExportContext.calls.reset();

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AnalyticsService,
          useValue: {
            initializeRuntimeState: () => {},
            track: async () => {},
            flush: () => [],
            pageViewEventName: () => 'page_view',
            promptForConsentIfNeeded: () => {},
            startPageEngagementTracking: () => {},
            stopPageEngagementTracking: () => {},
          } as any,
        },
        {
          provide: ConfigBootstrapService,
          useValue: {
            load: async (opts?: {
              domain?: string;
              pageId?: string;
              lang?: string;
            }) => {
              bootstrapLoadArgs.push(opts ?? {});
              return bootstrapResult;
            },
          },
        },
        {
          provide: ConfigSourceService,
          useValue: {
            loadSiteConfig: async () => null,
          },
        },
        {
          provide: DraftRegistryService,
          useValue: {
            listDrafts: () =>
              of([
                { domain: PRIMARY_DOMAIN, pageId: 'default' },
                { domain: SECONDARY_DOMAIN, pageId: 'default' },
              ]),
          },
        },
        {
          provide: ConfigurationsOrchestratorService,
          useValue: ORCHESTRATOR_STUB,
        },
        {
          provide: NgxAngoraService,
          useValue: {
            cssCreate: () => {},
            timeBetweenReCreate: 0,
            pushCombos: () => {},
            pushColors: () => {},
            updateColors: () => {},
          } as any,
        },
        provideRouter(
          [
            { path: '', component: AppShellComponent, pathMatch: 'full' },
            {
              path: 'loading-target',
              component: RouteTargetStub,
              canActivate: [() => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 50))],
            },
          ],
          withInMemoryScrolling({
            scrollPositionRestoration: 'enabled',
            anchorScrolling: 'enabled',
          })
        ),
      ],
    }).compileComponents();

    TestBed.overrideComponent(AppShellComponent, {
      remove: { imports: [WrapperOrchestrator, DebugWorkspaceComponent] },
      add: {
        imports: [WrapperOrchestratorStub, DebugWorkspaceStub, AsyncPipe],
      },
    });
  });

  afterEach(() => {
    setBrowserUrl('/context.html');
    TestBed.resetTestingModule();
  });

  it('should render main with id main-content and skip link', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main#main-content')).toBeTruthy();
    const skip = compiled.querySelector('a[href="#main-content"]');
    expect(skip).toBeTruthy();
    // Wrapper orchestrator should be present in template
    expect(compiled.querySelector('wrapper-orchestrator')).toBeTruthy();
  });

  it('starts with no rendered roots until the draft payload is applied', () => {
    const fixture = TestBed.createComponent(AppShellComponent);

    expect(fixture.componentInstance.rootComponentsIds()).toEqual([]);
    expect(fixture.componentInstance.modalRootIds()).toEqual([]);
  });

  it('shows a route transition status while client navigation is pending', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    const navigation = router.navigateByUrl('/loading-target');
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.routeTransitionActive()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.zlp-route-transition')).toBeTruthy();

    await navigation;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.routeTransitionActive()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.zlp-route-transition')).toBeFalsy();
  });

  it('does not render the debug workspace during SSR', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('debug-workspace')).toBeFalsy();
  });

  it('starts runtime bootstrap through the app initializer during SSR', async () => {
    setBrowserUrl(draftPreviewUrl(LEGAL_DOMAIN, 'legal-home'));
    TestBed.overrideProvider(PLATFORM_ID, {
      useValue: 'server',
    });
    TestBed.overrideProvider(REQUEST, {
      useValue: new Request(
        `https://test.zoolandingpage.com.mx/?draftDomain=${LEGAL_DOMAIN}&draftPageId=legal-home`
      ),
    });

    bootstrapResult = {
      ...bootstrapResult,
      domain: LEGAL_DOMAIN,
      pageId: 'legal-home',
      pageConfig: {
        version: 1,
        pageId: 'legal-home',
        domain: LEGAL_DOMAIN,
        rootIds: ['landingPage'],
        modalRootIds: [],
      },
      components: createComponentsPayload(
        {
          landingPage: {
            id: 'landingPage',
            type: 'container',
            config: { components: [] },
          },
        },
        { domain: LEGAL_DOMAIN, pageId: 'legal-home' }
      ),
    };

    await TestBed.runInInjectionContext(() => initializeRuntimeConfig());
    TestBed.createComponent(AppShellComponent);

    expect(
      bootstrapLoadArgs.some((entry) => entry.pageId === 'legal-home')
    ).toBeTrue();
  });

  it('clears rendered roots when draft components are invalid', async () => {
    pinResolvedDraftContext(LEGAL_DOMAIN);
    bootstrapResult = {
      ...bootstrapResult,
      domain: LEGAL_DOMAIN,
      pageId: 'default',
      components: null,
    };

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.rootComponentsIds()).toEqual([]);
    expect(fixture.componentInstance.modalRootIds()).toEqual([]);
    expect(
      ORCHESTRATOR_STUB.setExternalComponentsFromPayload
    ).toHaveBeenCalledWith(null);
  });

  it('clears rendered roots when the default preview draft has no external components', async () => {
    const activeUrl = draftPreviewUrl(PRIMARY_DOMAIN);
    setBrowserUrl(activeUrl);
    pinResolvedDraftContext(PRIMARY_DOMAIN);
    bootstrapResult = {
      ...bootstrapResult,
      domain: PRIMARY_DOMAIN,
      pageId: 'default',
      components: createComponentsPayload({}),
      pageConfig: {
        version: 1,
        pageId: 'default',
        domain: PRIMARY_DOMAIN,
        rootIds: ['skipToMainLink', 'siteHeader', 'landingPage', 'siteFooter'],
        modalRootIds: [
          'modalAnalyticsConsentRoot',
          'modalDemoRoot',
          'modalTermsRoot',
          'modalDataUseRoot',
        ],
      },
    };

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await flushDeferredBootstrapWork(fixture, {
      url: activeUrl,
      done: () =>
        ORCHESTRATOR_STUB.setExternalComponentsFromPayload.calls.any(),
    });

    expect(fixture.componentInstance.rootComponentsIds()).toEqual([]);
    expect(fixture.componentInstance.modalRootIds()).toEqual([]);
    expect(
      ORCHESTRATOR_STUB.setExternalComponentsFromPayload
    ).toHaveBeenCalledWith(null);
  });

  it('uses the full default preview draft payload when external components are present', async () => {
    const activeUrl = draftPreviewUrl(PRIMARY_DOMAIN);
    setBrowserUrl(activeUrl);
    pinResolvedDraftContext(PRIMARY_DOMAIN);
    bootstrapResult = {
      ...bootstrapResult,
      domain: PRIMARY_DOMAIN,
      pageId: 'default',
      components: createComponentsPayload({
        skipToMainLink: {
          id: 'skipToMainLink',
          type: 'link',
          config: { href: '#landing-main', text: 'Skip' },
        },
        siteHeader: {
          id: 'siteHeader',
          type: 'container',
          config: { components: [] },
        },
        landingPage: {
          id: 'landingPage',
          type: 'container',
          config: { components: [] },
        },
        siteFooter: {
          id: 'siteFooter',
          type: 'container',
          config: { components: ['siteFooterContent'] },
        },
        siteFooterContent: {
          id: 'siteFooterContent',
          type: 'container',
          config: { components: [] },
        },
        modalTermsRoot: {
          id: 'modalTermsRoot',
          type: 'container',
          config: { components: [] },
        },
      }),
      pageConfig: {
        version: 1,
        pageId: 'default',
        domain: PRIMARY_DOMAIN,
        rootIds: ['skipToMainLink', 'siteHeader', 'landingPage', 'siteFooter'],
        modalRootIds: [
          'modalAnalyticsConsentRoot',
          'modalDemoRoot',
          'modalTermsRoot',
          'modalDataUseRoot',
        ],
      },
    };

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await flushDeferredBootstrapWork(fixture, {
      url: activeUrl,
      done: () => fixture.componentInstance.rootComponentsIds().length === 4,
    });

    expect(fixture.componentInstance.rootComponentsIds()).toEqual([
      'skipToMainLink',
      'siteHeader',
      'landingPage',
      'siteFooter',
    ]);
    expect(fixture.componentInstance.modalRootIds()).toEqual([
      'modalAnalyticsConsentRoot',
      'modalDemoRoot',
      'modalTermsRoot',
      'modalDataUseRoot',
    ]);
    expect(
      ORCHESTRATOR_STUB.setExternalComponentsFromPayload
    ).toHaveBeenCalledWith(bootstrapResult.components);
    expect(ORCHESTRATOR_STUB.setDraftExportContext).toHaveBeenCalledWith({
      domain: PRIMARY_DOMAIN,
      pageId: 'default',
      rootIds: ['skipToMainLink', 'siteHeader', 'landingPage', 'siteFooter'],
      modalRootIds: [
        'modalAnalyticsConsentRoot',
        'modalDemoRoot',
        'modalTermsRoot',
        'modalDataUseRoot',
      ],
    });
  });

  it('uses REQUEST query params when resolving the draft during SSR', async () => {
    bootstrapResult = {
      ...bootstrapResult,
      domain: LEGAL_DOMAIN,
      pageId: 'legal-home',
      pageConfig: {
        version: 1,
        pageId: 'legal-home',
        domain: LEGAL_DOMAIN,
        rootIds: ['skipToMainLink', 'siteHeader', 'landingPage', 'siteFooter'],
        modalRootIds: [
          'modalAnalyticsConsentRoot',
          'modalTermsRoot',
          'modalDataUseRoot',
        ],
      },
      components: createComponentsPayload(
        {
          landingPage: {
            id: 'landingPage',
            type: 'container',
            config: { components: [] },
          },
        },
        { domain: LEGAL_DOMAIN, pageId: 'legal-home' }
      ),
    };

    TestBed.overrideProvider(PLATFORM_ID, {
      useValue: 'server',
    });
    TestBed.overrideProvider(REQUEST, {
      useValue: new Request(
        `https://test.zoolandingpage.com.mx/?draftDomain=${LEGAL_DOMAIN}&draftPageId=legal-home`
      ),
    });
    setBrowserUrl(draftPreviewUrl(LEGAL_DOMAIN, 'legal-home'));

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(
      bootstrapLoadArgs.some((entry) => entry.pageId === 'legal-home')
    ).toBeTrue();
  });
});
