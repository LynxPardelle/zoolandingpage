import { AsyncPipe } from '@angular/common';
import { Component, Input, REQUEST } from '@angular/core';
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
    <a href="#main-content">Skip to content</a>
    <header role="banner"></header>
    <nav aria-label="Primary"></nav>
    <main id="main-content" tabindex="-1"></main>
  `,
})
class WrapperOrchestratorStub {
  @Input() componentsIds: readonly unknown[] = [];
}

let bootstrapResult: any;
let bootstrapLoadArgs: Array<{ pageId?: string; lang?: string }>;

const ORCHESTRATOR_STUB = {
  modalHostConfig$: of(null),
  fallbackModalHostConfig: {},
  devDemoControlsComponents: [] as string[],
  getAllTheClassesFromComponents: () => [],
  setExternalComponentsFromPayload: jasmine.createSpy('setExternalComponentsFromPayload'),
  exportDraftComponentsPayload: () => ({
    version: 1,
    pageId: 'default',
    domain: 'zoolandingpage.com.mx',
    components: {},
  }),
};

describe('AppShellComponent', () => {
  beforeEach(async () => {
    bootstrapLoadArgs = [];
    bootstrapResult = {
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
    };
    ORCHESTRATOR_STUB.setExternalComponentsFromPayload.calls.reset();

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
            load: async (opts?: { pageId?: string; lang?: string }) => {
              bootstrapLoadArgs.push(opts ?? {});
              return bootstrapResult;
            },
          },
        },
        {
          provide: REQUEST,
          useValue: new Request('https://example.test/?draftDomain=despacholegalastralex.com&draftPageId=default'),
        },
        {
          provide: DraftRegistryService,
          useValue: {
            listDrafts: () => of([
              { domain: 'zoolandingpage.com.mx', pageId: 'default' },
              { domain: 'music.lynxpardelle.com', pageId: 'default' },
            ]),
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

  it('should build the debug draft panel with dynamic draft buttons', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const panel = component.debugDraftPanelComponents()[0] as any;
    const children = panel.config.components as any[];
    const draftButtonsContainer = children.find((entry) => entry.id === 'debugDraftPanelDraftButtons');
    const footerRow = children.find((entry) => entry.id === 'debugDraftPanelFooterRow');
    const draftButtons = draftButtonsContainer.config.components as any[];
    const refreshButton = (footerRow.config.components as any[]).find((entry) => entry.id === 'debugDraftRefreshButton');

    expect(panel.id).toBe('debugDraftPanelRoot');
    expect(draftButtons.map((entry) => entry.config.label)).toEqual([
      'despacholegalastralex.com / default',
      'music.lynxpardelle.com / default',
      'zoolandingpage.com.mx / default',
    ]);
    expect(refreshButton.config.icon).toBe('refresh');
  });

  it('clears rendered roots when draft components are invalid', async () => {
    bootstrapResult = {
      ...bootstrapResult,
      domain: 'despacholegalastralex.com',
      pageId: 'default',
      components: null,
    };

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.rootComponentsIds()).toEqual([]);
    expect(fixture.componentInstance.modalRootIds()).toEqual([]);
    expect(ORCHESTRATOR_STUB.setExternalComponentsFromPayload).toHaveBeenCalledWith(null);
  });

  it('clears rendered roots when the default Zoolandingpage draft has no external components', async () => {
    bootstrapResult = {
      ...bootstrapResult,
      domain: 'zoolandingpage.com.mx',
      pageId: 'default',
      components: {
        version: 1,
        pageId: 'default',
        domain: 'zoolandingpage.com.mx',
        components: {},
      },
      pageConfig: {
        version: 1,
        pageId: 'default',
        domain: 'zoolandingpage.com.mx',
        rootIds: ['skipToMainLink', 'siteHeader', 'landingPage', 'siteFooter'],
        modalRootIds: ['modalAnalyticsConsentRoot', 'modalDemoRoot', 'modalTermsRoot', 'modalDataUseRoot'],
      },
    };

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.rootComponentsIds()).toEqual([]);
    expect(fixture.componentInstance.modalRootIds()).toEqual([]);
    expect(ORCHESTRATOR_STUB.setExternalComponentsFromPayload).toHaveBeenCalledWith(null);
  });

  it('uses the full default Zoolandingpage draft payload when external components are present', async () => {
    bootstrapResult = {
      ...bootstrapResult,
      domain: 'zoolandingpage.com.mx',
      pageId: 'default',
      components: {
        version: 1,
        pageId: 'default',
        domain: 'zoolandingpage.com.mx',
        components: {
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
        },
      },
      pageConfig: {
        version: 1,
        pageId: 'default',
        domain: 'zoolandingpage.com.mx',
        rootIds: ['skipToMainLink', 'siteHeader', 'landingPage', 'siteFooter'],
        modalRootIds: ['modalAnalyticsConsentRoot', 'modalDemoRoot', 'modalTermsRoot', 'modalDataUseRoot'],
      },
    };

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.rootComponentsIds()).toEqual(['skipToMainLink', 'siteHeader', 'landingPage', 'siteFooter']);
    expect(fixture.componentInstance.modalRootIds()).toEqual(['modalAnalyticsConsentRoot', 'modalDemoRoot', 'modalTermsRoot', 'modalDataUseRoot']);
    expect(ORCHESTRATOR_STUB.setExternalComponentsFromPayload).toHaveBeenCalledWith(bootstrapResult.components);
  });

  it('uses REQUEST query params when resolving the draft during SSR', async () => {
    bootstrapResult = {
      ...bootstrapResult,
      domain: 'despacholegalastralex.com',
      pageId: 'legal-home',
      pageConfig: {
        version: 1,
        pageId: 'legal-home',
        domain: 'despacholegalastralex.com',
        rootIds: ['skipToMainLink', 'siteHeader', 'landingPage', 'siteFooter'],
        modalRootIds: ['modalAnalyticsConsentRoot', 'modalTermsRoot', 'modalDataUseRoot'],
      },
      components: {
        version: 1,
        pageId: 'legal-home',
        domain: 'despacholegalastralex.com',
        components: {
          landingPage: {
            id: 'landingPage',
            type: 'container',
            config: { components: [] },
          },
        },
      },
    };

    TestBed.overrideProvider(REQUEST, {
      useValue: new Request('https://example.test/?draftDomain=despacholegalastralex.com&draftPageId=legal-home'),
    });

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(bootstrapLoadArgs.some((entry) => entry.pageId === 'legal-home')).toBeTrue();
  });
});
