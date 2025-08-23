/**
 * App Component
 *
 * Main application component with proper typing and service integration.
 * Following MANDATORY requirements: Angular 17+, type-only definitions, atomic structure.
 */

import {
  afterEveryRender,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
// import { NgxAngoraService } from 'ngx-angora-css';
import { environment } from '../environments/environment';
import { NgxAngoraService } from './angora-css/ngx-angora.service';
import { AppFooterComponent, AppHeaderComponent } from './core/components/layout';
import type { HeaderNavItem } from './core/components/layout/app-header/app-header.types';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { FaqSectionComponent } from './landingpage/components/faq-section/faq-section.component';
import { FeaturesSectionComponent } from './landingpage/components/features-section/features-section.component';
import { FinalCtaSectionComponent } from './landingpage/components/final-cta-section/final-cta-section.component';
import { HeroSectionComponent } from './landingpage/components/hero-section';
import { InteractiveProcessComponent } from './landingpage/components/interactive-process/interactive-process.component';
import { RoiCalculatorSectionComponent } from './landingpage/components/roi-calculator-section/roi-calculator-section.component';
import { RoiNoteComponent } from './landingpage/components/roi-note/roi-note.component';
import { ServicesSectionComponent } from './landingpage/components/services-section/services-section.component';
import { TestimonialsSectionComponent } from './landingpage/components/testimonials-section/testimonials-section.component';
import { ModalComponent } from './shared/components/modal';
import { ToastComponent, ToastService } from './shared/components/utility/toast';

// Landing page data types
type FeatureCard = {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly benefits: readonly string[];
};

type ServiceCard = {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly color: string;
};

type TestimonialCard = {
  readonly name: string;
  readonly role: string;
  readonly company: string;
  readonly content: string;
  readonly rating: number;
  readonly avatar: string;
};

type InteractiveProcess = {
  readonly step: number;
  readonly title: string;
  readonly description: string;
  readonly detailedDescription: string;
  readonly duration: string;
  readonly deliverables: readonly string[];
  readonly isActive: boolean;
};

@Component({
  selector: 'app-legacy-root',
  imports: [
    AppHeaderComponent,
    AppFooterComponent,
    MatIconModule,
    HeroSectionComponent,
    RoiNoteComponent,
    FeaturesSectionComponent,
    InteractiveProcessComponent,
    ServicesSectionComponent,
    RoiCalculatorSectionComponent,
    TestimonialsSectionComponent,
    FaqSectionComponent,
    FinalCtaSectionComponent,
    ModalComponent,
    ToastComponent,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Injected services
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly _ank = inject(NgxAngoraService);
  private readonly toast = inject(ToastService);

  // App state
  private readonly appTitle = signal<string>(environment.app.name);

  // Landing page state
  readonly currentDemoStep = signal<number>(0);
  readonly navItems = signal<readonly HeaderNavItem[]>([
    { label: 'Inicio', href: '#home', isActive: true, isExternal: false },
    { label: 'Beneficios', href: '#features-section', isActive: false, isExternal: false },
    { label: 'Proceso', href: '#process-section', isActive: false, isExternal: false },
    { label: 'Servicios', href: '#services-section', isActive: false, isExternal: false },
    { label: 'Contacto', href: '#contact-section', isActive: false, isExternal: false },
  ]);
  readonly isCalculatorVisible = signal<boolean>(false);
  readonly calculatorBusinessSize = signal<'nano' | 'micro' | 'small' | 'medium'>('micro');
  readonly calculatorIndustry = signal<string>('ecommerce');
  readonly calculatorVisitors = signal<number>(1000);

  // Computed properties with proper typing
  readonly title = computed(() => this.appTitle());
  readonly currentLanguage = computed(() => this.languageService.currentLanguage());
  readonly currentTheme = computed(() => this.themeService.getCurrentTheme());
  readonly isProduction = computed(() => environment.production);
  // Header configuration (reactive)
  readonly headerConfig = computed(() => ({
    navItems: this.navItems(),
    useGradient: true,
    gradientFromKey: 'bgColor',
    gradientToKey: 'secondaryBgColor',
    enableScrollSpy: true,
    transparentUntilScroll: true,
    elevateOnScroll: true,
    showThemeToggle: true,
    showLanguageToggle: true,
  }));

  // Landing page data
  readonly heroData = signal({
    title: 'Convierte visitas en clientes con una landing rápida, clara y medible',
    subtitle: 'Lanza tu Landing Page Optimizada rápidamente, mide desde el primer día y mejora con datos reales.',
    description:
      'Suscripción desde 900 MXN/mes. Incluye dominio, alojamiento y medición en la nube. Diseño alineado a tu marca, optimización para buscadores y llamados a la acción visibles para impulsar el contacto.',
    primary: { label: 'Hablar por WhatsApp', trackLabel: 'cta_whatsapp_hero' },
    secondary: { label: 'Ver cómo funciona', trackLabel: 'cta_demo_hero' },
    badges: [
      { text: 'Más cierres de venta' },
      { text: 'Velocidad con carga en < 3s' },
      { text: 'Medición desde el día 1' },
      { text: 'ES/EN opcional' },
      { text: 'Accesible para todas las personas' },
    ],
  });

  readonly features = signal<readonly FeatureCard[]>([
    {
      icon: 'home',
      title: '¿Qué es una Landing Page Optimizada?',
      description:
        'Es una página enfocada en un solo objetivo: convertir visitas en clientes. Evita distracciones y guía al visitante paso a paso hasta el contacto o la compra.',
      benefits: [
        'Un objetivo claro: pedir información, comprar o agendar una cita',
        '3–5x más conversión que sitios con muchas opciones',
        'Mensaje directo sin ruido ni pasos innecesarios',
        'Llamadas a la acción visibles en los momentos correctos',
        'Carga rápida y navegación simple en móvil y escritorio',
      ],
    },
    {
      icon: 'filter_alt',
      title: 'Enfoque en conversiones',
      description:
        'Diseñada como embudo de ventas: mensajes claros, pruebas sociales y llamados a la acción que empujan al siguiente paso.',
      benefits: [
        'Genera contactos y oportunidades reales',
        'Menos fricción, más clics en tus botones',
        'Beneficios de negocio por encima de tecnicismos',
        'WhatsApp y llamadas a la acción siempre a la vista',
        'Lista para campañas publicitarias y redes sociales',
      ],
    },
    {
      icon: 'analytics',
      title: 'Medición desde el día 1',
      description:
        'Capturamos visitas, clics y avance de lectura. Sabes qué partes funcionan y dónde mejorar para vender más.',
      benefits: [
        'Eventos clave: llamadas a la acción y contacto por WhatsApp',
        'Datos de lectura: qué ven, qué leen y dónde abandonan',
        'Base para optimizar textos, secciones y formularios',
      ],
    },
    {
      icon: 'cloud',
      title: 'Poder de la Nube con Amazon Web Services (AWS)',
      description:
        'Disponibilidad 24/7 y velocidad global sin servidores propios. Usamos AWS, la nube confiable que usan millones de empresas multinacionales.',
      benefits: [
        'Carga en < 3s desde cualquier lugar',
        'Certificado de seguridad (SSL) incluido: candado de seguridad para generar confianza con los usuarios',
        'Escala automática en picos de tráfico',
        'CDN global para máxima velocidad y conexión desde cada rincón del mundo.',
        'Monitoreo 24/7 y alta disponibilidad',
        'Infraestructura de nivel empresarial mundial',
      ],
    },
    {
      icon: 'saved_search',
      title: 'Rápida, estable y lista para buscadores',
      description:
        'Base moderna con datos estructurados para mejor visibilidad en los buscadores. Rápida, estable y lista para crecer.',
      benefits: [
        'Menos abandonos en móvil y escritorio',
        'Optimización para que te encuentren los buscadores fácilmente, usando datos estructurados',
        'Certificados de seguridad (SSL) y disponibilidad constante',
        'Escalable en la nube cuando lo necesites',
      ],
    },
    {
      icon: 'psychology',
      title: 'Contenido y mejoras asistidas por IA',
      description:
        'Propuestas y textos asistidos por IA, siempre revisados por humanos. Más variantes y mejores opciones en menos tiempo.',
      benefits: [
        'Iteraciones rápidas guiadas por datos',
        'Textos claros y orientados a conversión',
        'Visuales alineados a tu marca',
        'Optimización continua opcional',
      ],
    },
  ]);

  readonly services = signal<readonly ServiceCard[]>([
    {
      icon: 'rocket_launch',
      title: 'Landing Page Optimizada',
      description:
        'Publica en días una landing rápida, clara y medible. Diseñada para convertir visitas en clientes reales.',
      features: [
        'Diseño adaptable a móvil, tablet y escritorio',
        'Carga rápida y experiencia fluida',
        'SEO básico y datos estructurados',
        'Medición desde el día 1 (clics y contacto)',
        'WhatsApp y llamadas a la acción estratégicamente ubicados',
      ],
      color: 'linkColor',
    },
    {
      icon: 'trending_up',
      title: 'Optimización y análisis',
      description:
        'Mejora continua con base en datos reales: pruebas A/B, ajustes de contenido y priorización por impacto.',
      features: [
        'Optimización de llamadas a la acción y flujo de ventas',
        'Recomendaciones accionables',
        'Pruebas A/B y cambios orientados a resultados (extra)',
        'Reportes simples con métricas clave (extra)',
      ],
      color: 'secondaryAccentColor',
    },
    {
      icon: 'groups',
      title: 'Acompañamiento y soporte',
      description: 'Acompañamiento de principio a fin: contenidos, estilo, publicación y mantenimiento básico.',
      features: [
        'Asesoría de contenidos y estructura',
        'Personalización visual (modo claro/oscuro y colores)',
        'Publicación en servidor confiable con certificados de seguridad (SSL).',
        'Soporte y mejoras constantes.',
      ],
      color: 'accentColor',
    },
  ]);

  readonly testimonials = signal<readonly TestimonialCard[]>([
    {
      name: 'María González',
      role: 'Directora de Marketing',
      company: 'TechStart Solutions',
      content:
        'En tres meses subimos la tasa de conversión y bajó el costo por contacto. Claridad y velocidad marcan la diferencia.',
      rating: 4.5,
      avatar: '👩‍💼',
    },
    {
      name: 'Carlos Rodríguez',
      role: 'CEO',
      company: 'Innovate Commerce',
      content: 'En 60 días recuperamos la inversión. La medición nos permitió optimizar campañas sin gastar de más.',
      rating: 5,
      avatar: '👨‍💼',
    },
    {
      name: 'Ana Fernández',
      role: 'Fundadora',
      company: 'Creative Studio',
      content:
        'Mensaje claro, pruebas sociales y llamadas a la acción visibles: más consultas reales y mejor seguimiento.',
      rating: 4,
      avatar: '👩‍🎨',
    },
  ]);

  readonly interactiveProcess = signal<readonly InteractiveProcess[]>([
    {
      step: 1,
      title: 'Descubrimiento',
      description: 'Entendemos objetivos, propuesta de valor y a quién quieres llegar.',
      detailedDescription:
        'Reunión breve para conocer tu negocio, propuesta de valor y audiencia. Definimos mensajes y priorizamos lo esencial para lanzar rápido.',
      duration: '1 día hábil',
      deliverables: ['Resumen claro de objetivos', 'Mensajes clave y estructura sugerida', 'Checklist de requisitos'],
      isActive: true,
    },
    {
      step: 2,
      title: 'Prototipo rápido con IA',
      description: 'Te mostramos un demo navegable con textos y diseño inicial.',
      detailedDescription:
        'IA + revisión humana para un demo con textos, colores y estructura visual. Verás cómo quedaría tu landing.',
      duration: '3-5 días hábiles',
      deliverables: [
        'Demo navegable',
        'Textos orientados a conversión',
        'Diseño base y estilos',
        'Medición básica lista desde el inicio',
      ],
      isActive: false,
    },
    {
      step: 3,
      title: 'Revisión y cambios',
      description: 'Revisamos juntos y ajustamos lo que más impacta en resultados.',
      detailedDescription:
        'Retroalimentación breve, priorizamos cambios de mayor impacto para alinear mensaje y diseño.',
      duration: '1 día hábil',
      deliverables: ['Lista de cambios priorizados', 'Plan breve para implementar mejoras'],
      isActive: false,
    },
    {
      step: 4,
      title: 'Lanzamiento',
      description: 'Publicamos tu landing con medición activa y SEO básico.',
      detailedDescription:
        'Ajustes finales, conexión de dominio, certificados de seguridad (SSL) activos y verificación de medición.',
      duration: '2-3 días hábiles',
      deliverables: [
        'Landing publicada y revisada',
        'Certificados de seguridad (SSL) activos y SEO básico',
        'Medición de clics y contactos',
      ],
      isActive: false,
    },
    {
      step: 5,
      title: 'Datos reales',
      description: 'Analizamos resultados y proponemos mejoras accionables.',
      detailedDescription: 'Monitoreamos clics y contactos. Compartimos reporte simple y sugerencias para mejorar.',
      duration: 'Desde el lanzamiento',
      deliverables: [
        'Métricas de clics y contactos',
        'Reporte simple de resultados',
        'Sugerencias iniciales de mejora',
        'Opcional: preparación para análisis más avanzado',
      ],
      isActive: false,
    },
    {
      step: 6,
      title: 'Mejora continua (opcional)',
      description: 'Probamos cambios y mejoramos con base en datos.',
      detailedDescription: 'Seguimos probando variantes y aplicando mejoras según resultados para captar más clientes.',
      duration: 'Servicio opcional continuo',
      deliverables: ['Pruebas y resultados documentados', 'Lista de mejoras sugeridas'],
      isActive: false,
    },
  ]);

  readonly calculatedROI = computed(() => {
    const businessSize = this.calculatorBusinessSize();
    const industry = this.calculatorIndustry();
    const visitors = this.calculatorVisitors();

    // ROI calculation based on business size and industry
    let baseROI = 150;
    let conversionRate = 0.02;

    // Business size multipliers
    const sizeMultipliers = {
      nano: { roi: 1.2, conversion: 1.1 },
      micro: { roi: 1.5, conversion: 1.3 },
      small: { roi: 1.8, conversion: 1.5 },
      medium: { roi: 2.2, conversion: 1.7 },
    };

    // Industry multipliers
    const industryMultipliers: Record<string, { roi: number; conversion: number }> = {
      ecommerce: { roi: 1.8, conversion: 1.6 },
      services: { roi: 1.5, conversion: 1.4 },
      restaurant: { roi: 1.3, conversion: 1.2 },
      health: { roi: 1.6, conversion: 1.5 },
      education: { roi: 1.4, conversion: 1.3 },
      'real-estate': { roi: 2.0, conversion: 1.8 },
      consulting: { roi: 1.7, conversion: 1.5 },
    };

    const sizeMultiplier = sizeMultipliers[businessSize];
    const industryMultiplier = industryMultipliers[industry] || industryMultipliers['services'];

    const finalROI = Math.round(baseROI * sizeMultiplier.roi * industryMultiplier.roi);
    const finalConversion =
      Math.round(conversionRate * sizeMultiplier.conversion * industryMultiplier.conversion * 100) / 100;

    // Calculate monthly increase based on visitors and conversion improvement
    const averageOrderValue =
      businessSize === 'nano' ? 500 : businessSize === 'micro' ? 800 : businessSize === 'small' ? 1200 : 2000;
    const monthlyIncrease = Math.round(visitors * finalConversion * averageOrderValue * 0.3); // 30% improvement factor

    return {
      roiPercentage: finalROI,
      conversionImprovement: Math.round((finalConversion / conversionRate) * 10) / 10,
      monthlyIncrease,
    };
  });

  // Calculator computed value
  readonly estimatedROI = computed(() => {
    const businessSize = this.calculatorBusinessSize();
    const industry = this.calculatorIndustry();

    const sizeMultiplier = {
      nano: 0.8,
      micro: 1,
      small: 1.5,
      medium: 2.5,
    }[businessSize];

    const industryMultiplier = {
      retail: 1.2,
      tech: 1.8,
      healthcare: 1.5,
      education: 1.1,
      'catalog-sales': 1.4,
      freelance: 1.1,
      'home-services': 1.3,
      other: 1.0,
    }[industry];

    // Safety check for undefined multipliers
    const finalSizeMultiplier = sizeMultiplier ?? 1;
    const finalIndustryMultiplier = industryMultiplier ?? 1;

    const baseROI = 250;
    const roiPercentage = Math.round(baseROI * finalSizeMultiplier * finalIndustryMultiplier);

    // Estimate monthly revenue based on business size and industry
    const baseRevenue =
      {
        nano: 15000,
        micro: 35000,
        small: 85000,
        medium: 180000,
      }[businessSize] ?? 35000;

    const monthlyRevenue = Math.round(baseRevenue * finalIndustryMultiplier * (roiPercentage / 100));

    return {
      roiPercentage,
      monthlyRevenue,
    };
  });

  /* Angora CSS */
  public angoraHasBeenInitialized = false;

  constructor() {
    afterNextRender(() => {
      if (!this.angoraHasBeenInitialized) {
        this.initializeAngoraConfiguration();
      } else {
        this._ank.cssCreate();
      }
    });
    afterEveryRender(() => {
      this._ank.cssCreate();
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
    this.toast.success(`Position changed to: ${position.message}`);

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

  // Angora CSS
  initializeAngoraConfiguration(): void {
    if (!this.angoraHasBeenInitialized) {
      // this._ank.changeSections([]);
      // this._ank.changeDebugOption(true);
      this.angoraHasBeenInitialized = true;
      // Configure combos for reusable styles
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

  // Interactive methods
  setDemoStep(step: number): void {
    this.currentDemoStep.set(step);

    // Update demo data reactively
    this.interactiveProcess.update(demos =>
      demos.map(demo => ({
        ...demo,
        isActive: demo.step === step + 1,
      }))
    );
  }

  toggleCalculator(): void {
    this.isCalculatorVisible.update(visible => !visible);
  }

  updateBusinessSize(size: 'nano' | 'micro' | 'small' | 'medium'): void {
    this.calculatorBusinessSize.set(size);
  }

  updateIndustry(industry: string): void {
    this.calculatorIndustry.set(industry);
  }

  updateVisitors(visitors: number): void {
    this.calculatorVisitors.set(visitors);
  }

  openWhatsApp(): void {
    const message = encodeURIComponent(
      `¡Hola! Me interesa conocer más sobre sus servicios de consultoría tecnológica para landing pages. ¿Podrían ayudarme?`
    );
    window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
  }

  // Analytics tracking methods
  trackCTAClick(ctaType: string, location: string): void {
    if (environment.features.analytics) {
      console.log(`CTA clicked: ${ctaType} at ${location}`);
      // Here would go actual analytics tracking
    }
  }

  trackSectionView(sectionName: string): void {
    if (environment.features.analytics) {
      console.log(`Section viewed: ${sectionName}`);
      // Here would go actual analytics tracking
    }
  }

  // Header nav change handler (from scroll spy or click)
  onNavChange(item: HeaderNavItem): void {
    this.navItems.update(items => items.map(i => ({ ...i, isActive: i.href === item.href })));
  }
}
