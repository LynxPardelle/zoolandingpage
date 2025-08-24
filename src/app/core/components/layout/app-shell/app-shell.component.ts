import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterEveryRender,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AppFooterComponent, AppHeaderComponent } from '..';
import { environment } from '../../../../../environments/environment';
import { NgxAngoraService } from '../../../../angora-css/ngx-angora.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ToastComponent, ToastService } from '../../../../shared/components/utility/toast';
import { AnalyticsCategories, AnalyticsEvents } from '../../../../shared/services/analytics.events';
import { AnalyticsService } from '../../../../shared/services/analytics.service';
import { LanguageService } from '../../../services/language.service';
import { ThemeService } from '../../../services/theme.service';
import type { HeaderNavItem } from '../app-header/app-header.types';
import { AppShellConfig } from './app-shell.types';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppHeaderComponent, AppFooterComponent, RouterOutlet, ModalComponent, ToastComponent],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  readonly debugMode = environment.features.debugMode;
  // App state
  private readonly appTitle = signal<string>(environment.app.name);

  // Computed properties with proper typing
  readonly isProduction = computed(() => environment.production);

  // Services
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly _ank = inject(NgxAngoraService);
  private readonly toast = inject(ToastService);
  private readonly events = inject(AnalyticsService);
  private angoraHasBeenInitialized = false;
  // Ensure global Theme/Language services are initialized at shell level
  private readonly _theme = inject(ThemeService);
  private readonly _lang = inject(LanguageService);
  private readonly activeHref = signal<string | null>(null);

  cfg = input<AppShellConfig>({ skipLinkLabel: 'Skip to content' });

  // Localized skip link label (falls back to provided cfg if any)
  readonly skipLabel = computed(() => {
    const provided = this.cfg()?.skipLinkLabel;
    if (provided && provided.trim().length > 0) return provided;
    return this._lang.currentLanguage() === 'en' ? 'Skip to content' : 'Saltar al contenido';
  });

  // Minimal header config until centralized state is introduced
  headerConfig = computed(() => ({
    // Language-aware navigation labels (doc-first i18n)
    navItems:
      this._lang.currentLanguage() === 'en'
        ? [
          { label: 'Home', href: '#home', isActive: this.activeHref() === '#home', isExternal: false },
          {
            label: 'Benefits',
            href: '#features-section',
            isActive: this.activeHref() === '#features-section',
            isExternal: false,
          },
          {
            label: 'Process',
            href: '#process-section',
            isActive: this.activeHref() === '#process-section',
            isExternal: false,
          },
          {
            label: 'Services',
            href: '#services-section',
            isActive: this.activeHref() === '#services-section',
            isExternal: false,
          },
          {
            label: 'Contact',
            href: '#contact-section',
            isActive: this.activeHref() === '#contact-section',
            isExternal: false,
          },
        ]
        : [
          { label: 'Inicio', href: '#home', isActive: this.activeHref() === '#home', isExternal: false },
          {
            label: 'Beneficios',
            href: '#features-section',
            isActive: this.activeHref() === '#features-section',
            isExternal: false,
          },
          {
            label: 'Proceso',
            href: '#process-section',
            isActive: this.activeHref() === '#process-section',
            isExternal: false,
          },
          {
            label: 'Servicios',
            href: '#services-section',
            isActive: this.activeHref() === '#services-section',
            isExternal: false,
          },
          {
            label: 'Contacto',
            href: '#contact-section',
            isActive: this.activeHref() === '#contact-section',
            isExternal: false,
          },
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
      this.analytics.track(AnalyticsEvents.PageView, {
        category: AnalyticsCategories.Navigation,
        label: evt.urlAfterRedirects,
      });
    });

    // Initialize Angora CSS once, then regenerate after every render
    afterNextRender(() => {
      this.initializeAngoraConfiguration();
      this._ank.cssCreate();
    });
    afterEveryRender(() => this._ank.cssCreate());

    // Keep <html lang> in sync with current language for screen readers/UA
    // effect() must run within injection context (constructor is OK)
    effect(() => {
      const lang = this._lang.currentLanguage();
      try {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('lang', lang);
          // LTR languages by default (es/en); adjust if RTL added in future
          document.documentElement.setAttribute('dir', 'ltr');
        }
      } catch {
        // no-op for SSR
      }
    });

    this.initDebugOverlay();
  }

  focusMain(evt: Event): void {
    evt.preventDefault();
    const el = this.mainRef()?.nativeElement;
    if (el) {
      el.focus();
    }
  }

  onNavChange(item: HeaderNavItem): void {
    this.activeHref.set(item.href);
  }

  private initializeAngoraConfiguration(): void {
    if (this.angoraHasBeenInitialized) return;
    this.angoraHasBeenInitialized = true;
    // this._ank.changeSections([]);
    // this._ank.changeDebugOption(true);
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

  // Demo triggers (will be removed or replaced with proper examples later)
  showDemoModal(): void {
    // For now just push a toast to simulate open; modal service evolution upcoming
    this.toast.push('info', 'Modal open triggered (placeholder)');
  }

  showDemoToast(): void {
    // Cycle through different toast types and features
    const demos = [
      () => this.toast.success('Order processed successfully!'),
      () => this.toast.error('Network connection failed'),
      () => this.toast.warning('Your session will expire in 5 minutes'),
      () => this.toast.info('New features available in settings'),
      () =>
        this.toast.show({
          level: 'success',
          title: 'File Upload Complete',
          text: 'Your document has been uploaded and processed successfully.',
          autoCloseMs: 6000,
        }),
      () =>
        this.toast.show({
          level: 'warning',
          title: 'Unsaved Changes',
          text: 'You have unsaved changes. Do you want to save before leaving?',
          autoCloseMs: 0,
          actions: [
            {
              label: 'Save',
              action: () => this.toast.success('Changes saved successfully!'),
              style: 'primary',
            },
            {
              label: 'Discard',
              action: () => console.log('Changes discarded'),
              style: 'secondary',
            },
          ],
        }),
    ];

    // Get random demo
    const randomDemo = demos[Math.floor(Math.random() * demos.length)];
    randomDemo();
  }

  showErrorToast(): void {
    this.toast.show({
      level: 'error',
      title: 'Critical Error',
      text: 'The operation could not be completed. Please contact support if this issue persists.',
      autoCloseMs: 0, // Errors should not auto-dismiss
      actions: [
        {
          label: 'Contact Support',
          action: () => {
            this.toast.info('Opening support chat...');
            // Add actual support logic here
          },
          style: 'primary',
        },
        {
          label: 'Try Again',
          action: () => {
            this.toast.warning('Retrying operation...');
            // Add retry logic here
          },
          style: 'secondary',
        },
      ],
    });
  }

  showActionToast(): void {
    this.toast.show({
      level: 'info',
      title: 'Update Available',
      text: 'Version 2.1.0 is ready to install with new features and bug fixes.',
      autoCloseMs: 10000,
      actions: [
        {
          label: 'Update Now',
          action: () => {
            this.toast.success('Update started! Application will restart automatically.');
            // Add update logic here
          },
          style: 'primary',
        },
        {
          label: 'View Changes',
          action: () => {
            this.toast.info('Opening changelog...');
            // Add changelog logic here
          },
          style: 'secondary',
        },
        {
          label: 'Later',
          action: () => {
            this.toast.warning("Update postponed. You'll be reminded in 24 hours.");
          },
          style: 'secondary',
        },
      ],
    });
  }

  showPositionDemo(): void {
    const positions = [
      { vertical: 'top' as const, horizontal: 'right' as const, message: 'Top Right' },
      { vertical: 'top' as const, horizontal: 'center' as const, message: 'Top Center' },
      { vertical: 'top' as const, horizontal: 'left' as const, message: 'Top Left' },
      { vertical: 'bottom' as const, horizontal: 'left' as const, message: 'Bottom Left' },
      { vertical: 'bottom' as const, horizontal: 'center' as const, message: 'Bottom Center' },
      { vertical: 'bottom' as const, horizontal: 'right' as const, message: 'Bottom Right (default)' },
    ];

    const currentIndex = this.positionDemoIndex % positions.length;
    const position = positions[currentIndex];

    this.toast.setPosition({ vertical: position.vertical, horizontal: position.horizontal });
    this.toast.success(`Position changed to: ${ position.message }`);

    this.positionDemoIndex++;
  }

  clearAllToasts(): void {
    this.toast.clear();
    // Show a brief confirmation
    setTimeout(() => {
      this.toast.info('All notifications cleared');
    }, 100);
  }

  private positionDemoIndex = 0;

  // Debug overlay: keep last 10 analytics events when debug mode is on
  readonly recentEvents = signal<readonly string[]>([]);
  private initDebugOverlay(): void {
    if (!this.debugMode) return;
    try {
      this.events.onEvent().subscribe(evt => {
        const next = [`${ evt.name } | ${ evt.category || '' } | ${ evt.label || '' }`].concat(this.recentEvents());
        this.recentEvents.set(next.slice(0, 10));
      });
    } catch {
      // ignore overlay errors
    }
  }
}
