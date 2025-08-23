import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterEveryRender,
  afterNextRender,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AppFooterComponent, AppHeaderComponent } from '..';
import { NgxAngoraService } from '../../../../angora-css/ngx-angora.service';
import { AnalyticsService } from '../../../../shared/services/analytics.service';
import { LanguageService } from '../../../services/language.service';
import { ThemeService } from '../../../services/theme.service';
import { AppShellConfig } from './app-shell.types';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppHeaderComponent, AppFooterComponent, RouterOutlet],
  template: `
    <a class="sr-only-focusable" [href]="'#main-content'" (click)="focusMain($event)">{{
      cfg().skipLinkLabel || 'Skip to content'
    }}</a>
    <app-header [config]="headerConfig()"></app-header>
    <main id="main-content" #main role="main" tabindex="-1">
      <router-outlet></router-outlet>
    </main>
    @defer {
    <app-footer></app-footer>
    } @placeholder {
    <footer class="ank-bg-secondaryBgColor ank-color-secondaryTextColor ank-py-24px ank-px-16px">
      <div class="ank-container ank-maxWidth-7xl ank-marginInline-auto ank-display-flex ank-jc-center ank-gap-16px">
        <div class="ank-width-160px ank-height-12px ank-bg-bgColor ank-opacity-40 ank-borderRadius-8px"></div>
        <div class="ank-width-200px ank-height-12px ank-bg-bgColor ank-opacity-30 ank-borderRadius-8px"></div>
      </div>
    </footer>
    } @loading {
    <footer class="ank-bg-secondaryBgColor ank-py-24px ank-px-16px">
      <div
        class="ank-container ank-maxWidth-7xl ank-marginInline-auto ank-textAlign-center ank-color-secondaryTextColor"
      >
        Cargando pie de página…
      </div>
    </footer>
    } @error {
    <footer class="ank-bg-secondaryBgColor ank-py-24px ank-px-16px">
      <div
        class="ank-container ank-maxWidth-7xl ank-marginInline-auto ank-textAlign-center ank-color-secondaryTextColor"
      >
        No se pudo cargar el pie de página.
      </div>
    </footer>
    }
  `,
  styles: [
    `
      .sr-only-focusable {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      .sr-only-focusable:focus {
        position: static;
        width: auto;
        height: auto;
        padding: 0.5rem 1rem;
        background: #000;
        color: #fff;
        z-index: 1000;
      }
      main {
        outline: none;
      }
    `,
  ],
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly _ank = inject(NgxAngoraService);
  private angoraHasBeenInitialized = false;
  // Ensure global Theme/Language services are initialized at shell level
  private readonly _theme = inject(ThemeService);
  private readonly _lang = inject(LanguageService);

  cfg = input<AppShellConfig>({ skipLinkLabel: 'Skip to content' });

  // Minimal header config until centralized state is introduced
  headerConfig = computed(() => ({
    navItems: [
      { label: 'Inicio', href: '#home', isActive: false, isExternal: false },
      { label: 'Beneficios', href: '#features-section', isActive: false, isExternal: false },
      { label: 'Proceso', href: '#process-section', isActive: false, isExternal: false },
      { label: 'Servicios', href: '#services-section', isActive: false, isExternal: false },
      { label: 'Contacto', href: '#contact-section', isActive: false, isExternal: false },
    ],
    useGradient: true,
    gradientFromKey: 'bgColor',
    gradientToKey: 'secondaryBgColor',
    enableScrollSpy: true,
    transparentUntilScroll: true,
    elevateOnScroll: true,
    showThemeToggle: true,
    showLanguageToggle: true,
  }));

  readonly mainRef = viewChild<ElementRef<HTMLElement>>('main');

  constructor() {
    // Track page views exactly once per navigation end
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(evt => {
      this.analytics.track('page_view', { category: 'navigation', label: evt.urlAfterRedirects });
    });

    // Initialize Angora CSS once, then regenerate after every render
    afterNextRender(() => {
      this.initializeAngoraConfiguration();
      this._ank.cssCreate();
    });
    afterEveryRender(() => this._ank.cssCreate());
  }

  focusMain(evt: Event): void {
    evt.preventDefault();
    const el = this.mainRef()?.nativeElement;
    if (el) {
      el.focus();
    }
  }

  private initializeAngoraConfiguration(): void {
    if (this.angoraHasBeenInitialized) return;
    this.angoraHasBeenInitialized = true;
    this._ank.pushCombos({
      cardHover: [
        'ank-transition-all ank-td-300ms ank-transformHover-translateYSDMIN4pxED ank-boxShadowHover-0__0_5rem__1rem__rgbaSD0COM0COM0COM0_5ED',
      ],
      btnBase: [
        'ank-px-VAL1DEF1_5remDEF ank-py-VAL2DEF0_75remDEF ank-borderRadius-VAL3DEF0_5remDEF ank-fontWeight-VAL4DEF550DEF ank-transformHover-translateYSDVAL5DEFMIN1pxDEFED',
      ],
      sectionPadding: ['ank-py-80px ank-px-20px'],
      containerMax: ['ank-maxWidth-1200px ank-mx-auto'],
      gridCol2: [
        'ank-display-grid ank-gridTemplateColumns-1fr ank-gridTemplateColumns-md-repeatSD2COM1frED ank-gridTemplateColumns-lg-repeatSD3COM1frED ank-gap-2rem',
      ],
      textGradient: [
        'ank-bgi-linearMINgradientSDVAL1DEF90degDEFCOMVAL2DEFabyssDEFCOMVAL3DEFwhiteDEFED ank-bgcl-text ank-color-transparent',
      ],
    });
  }
}
