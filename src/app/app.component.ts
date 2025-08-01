/**
 * App Component
 *
 * Main application component with proper typing and service integration.
 * Following MANDATORY requirements: Angular 17+, type-only definitions, atomic structure.
 */

import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgxAngoraService } from 'ngx-angora-css';
import { environment } from '../environments/environment';
import {
  AppContainerComponent,
  AppFooterComponent,
  AppHeaderComponent,
  AppSectionComponent,
} from './core/components/layout';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';

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

type InteractiveDemo = {
  readonly step: number;
  readonly title: string;
  readonly description: string;
  readonly detailedDescription: string;
  readonly duration: string;
  readonly deliverables: readonly string[];
  readonly isActive: boolean;
};

@Component({
  selector: 'app-root',
  imports: [AppContainerComponent, AppHeaderComponent, AppFooterComponent, AppSectionComponent, MatIconModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Injected services
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly _ank = inject(NgxAngoraService);

  // App state
  private readonly appTitle = signal<string>(environment.app.name);

  // Landing page state
  readonly currentDemoStep = signal<number>(0);
  readonly isCalculatorVisible = signal<boolean>(false);
  readonly calculatorBusinessSize = signal<'nano' | 'micro' | 'small' | 'medium'>('micro');
  readonly calculatorIndustry = signal<string>('ecommerce');
  readonly calculatorVisitors = signal<number>(1000);

  // Computed properties with proper typing
  readonly title = computed(() => this.appTitle());
  readonly currentLanguage = computed(() => this.languageService.currentLanguage());
  readonly currentTheme = computed(() => this.themeService.getCurrentTheme());
  readonly isProduction = computed(() => environment.production);

  // Landing page data
  readonly heroData = signal({
    title: 'Landing Pages hechas con tecnología Web Inteligente para Nano, Micro y Medianas Empresas',
    subtitle: 'Descubre cómo podemos potenciar tu presencia digital y aumentar tus ventas',
    description:
      'Somos una consultora de tecnología especializada en ayudar a nano y micro empresas a crecer a través de soluciones web inteligentes, cloud computing, análisis de datos e inteligencia artificial. Esta landing page es nuestra demo en vivo.',
    primaryCta: 'Solicitar Consultoría',
    secondaryCta: 'Explorar Demo Tutorial',
  });

  readonly features = signal<readonly FeatureCard[]>([
    {
      icon: 'target_on',
      title: '¿Qué es una Landing Page?',
      description:
        'Una página web especializada que tiene un único objetivo: convertir visitantes en clientes potenciales. A diferencia de un sitio web tradicional con múltiples páginas y distracciones, una landing page está diseñada estratégicamente para guiar al visitante hacia una acción específica.',
      benefits: [
        'Un solo objetivo específico: Solicitar información, comprar un producto, o descargar un recurso',
        'Conversión 3-5 veces mayor que sitios web tradicionales con múltiples opciones',
        'Mensaje claro y directo sin distracciones que confundan al visitante',
        'Llamadas a la acción (botones) ubicadas estratégicamente para maximizar clics',
        'Experiencia de usuario optimizada: Carga rápida y fácil navegación',
        'Medición precisa de resultados: Sabes exactamente cuántas personas realizaron la acción deseada',
      ],
    },
    {
      icon: 'analytics',
      title: 'Análisis de Datos - Servicio Adicional',
      description:
        'Ofrecemos servicios especializados de análisis de datos para entender el comportamiento de tus visitantes. Este servicio adicional te permite tomar decisiones basadas en datos reales de tu negocio y optimizar continuamente tu landing page.',
      benefits: [
        'Recopilación automática: Sistema que registra cada visita, clic y acción (servicio adicional)',
        'Análisis de comportamiento: Identificamos patrones y puntos de mejora (servicio separado)',
        'Reportes personalizados: Datos presentados de forma clara y accionable',
        'Recomendaciones estratégicas: Sugerencias basadas en el análisis de datos',
        'Dashboards básicos incluidos: Métricas esenciales desde el primer día',
        'Dashboards en tiempo real: Próximamente disponible como servicio premium',
      ],
    },
    {
      icon: 'cloud',
      title: 'Poder de la Nube con Amazon Web Services (AWS)',
      description:
        'La "nube" es una tecnología que permite que tu landing page esté disponible en internet 24/7 sin necesidad de comprar y mantener servidores físicos. Utilizamos AWS, la plataforma de nube más confiable del mundo, usada por Netflix, Spotify y millones de empresas.',
      benefits: [
        'Hosting ultra-rápido: Tu página carga en menos de 3 segundos desde cualquier parte del mundo',
        'Certificados de seguridad SSL incluidos: El candado verde que da confianza a tus visitantes',
        'Escalabilidad automática: Si tienes mucho tráfico, el sistema se adapta automáticamente',
        'Red global de distribución (CDN): Copias de tu página en múltiples países para velocidad óptima',
        'Monitoreo constante: Sistema que vigila tu página 24/7 y nos avisa si hay algún problema',
        'Infraestructura empresarial: La misma tecnología que usan las empresas más grandes del mundo',
      ],
    },
    {
      icon: 'psychology',
      title: 'Inteligencia Artificial para Resultados Superiores',
      description:
        'Utilizamos IA (Inteligencia Artificial) no como reemplazo humano, sino como una herramienta poderosa que nos ayuda a crear landing pages más efectivas en menos tiempo y a mantener nuestros sistemas siempre actualizados con las mejores prácticas del mercado.',
      benefits: [
        'Optimización inteligente de textos: La IA sugiere mejoras en títulos y descripciones para mayor impacto',
        'Creación asistida: Combinamos experiencia humana con eficiencia de IA para resultados superiores',
        'Actualizaciones automáticas: Nuestros sistemas se mejoran constantemente con nuevas funcionalidades',
        'Nuevos productos integrados: Desarrollamos constantemente nuevas herramientas que se conectan con tu landing page',
        'Análisis predictivo: Identificamos tendencias y oportunidades antes de que sean evidentes',
        'Mejoras basadas en datos: La IA encuentra patrones en miles de landing pages para optimizar la tuya',
      ],
    },
  ]);

  readonly services = signal<readonly ServiceCard[]>([
    {
      icon: 'rocket_launch',
      title: 'Landing Pages Inteligentes',
      description: 'Creamos páginas web optimizadas con IA para maximizar tu conversión con entrega ágil y eficiente',
      features: [
        'Diseño responsive para todos los dispositivos',
        'Carga ultra rápida (menos de 3 segundos)',
        'SEO técnico optimizado para buscadores',
        'Análisis de datos desde el primer día',
        'Entrega ágil sin comprometer calidad',
      ],
      color: 'primary',
    },
    {
      icon: 'trending_up',
      title: 'Análisis y Optimización de Datos',
      description: 'Servicios especializados de análisis de datos y optimización continua (servicio adicional)',
      features: [
        'Análisis detallado del comportamiento (servicio separado)',
        'Pruebas A/B con metodología científica',
        'Optimización de formularios y botones',
        'Dashboards en tiempo real (próximamente)',
        'Reportes personalizados y recomendaciones',
      ],
      color: 'success',
    },
    {
      icon: 'groups',
      title: 'Consultoría Tecnológica Integral',
      description: 'Te acompañamos en todo el proceso con expertise en tecnologías web modernas',
      features: [
        'Consultoría estratégica personalizada',
        'Implementación de mejores prácticas',
        'Capacitación en el uso de herramientas',
        'Soporte técnico especializado continuo',
      ],
      color: 'info',
    },
  ]);

  readonly testimonials = signal<readonly TestimonialCard[]>([
    {
      name: 'María González',
      role: 'Directora de Marketing',
      company: 'TechStart Solutions',
      content:
        'Nuestra conversión aumentó un 340% en los primeros 3 meses. El diseño y la estrategia fueron excepcionales.',
      rating: 5,
      avatar: '👩‍💼',
    },
    {
      name: 'Carlos Rodríguez',
      role: 'CEO',
      company: 'Innovate Commerce',
      content: 'El ROI fue inmediato. En 60 días recuperamos la inversión y seguimos creciendo.',
      rating: 5,
      avatar: '👨‍💼',
    },
    {
      name: 'Ana Fernández',
      role: 'Fundadora',
      company: 'Creative Studio',
      content: 'Profesionalismo excepcional. Entendieron nuestra visión y la superaron.',
      rating: 5,
      avatar: '👩‍🎨',
    },
  ]);

  readonly interactiveDemo = signal<readonly InteractiveDemo[]>([
    {
      step: 1,
      title: 'Toma de Requerimientos',
      description: 'Entendemos tu negocio, objetivos y audiencia objetivo a través de una consultoría personalizada',
      detailedDescription:
        'En esta fase inicial realizamos una consultoría exhaustiva para comprender perfectamente tu negocio. Analizamos tu modelo de negocio actual, identificamos tu audiencia objetivo y definimos los objetivos específicos que quieres lograr con tu landing page. También revisamos tu competencia, tu propuesta de valor única y los puntos de dolor de tus clientes potenciales.',
      duration: '1-2 días hábiles',
      deliverables: [
        'Documento de requerimientos técnicos y de negocio',
        'Análisis de audiencia objetivo y personas',
        'Definición de objetivos y KPIs principales',
        'Estrategia de contenido y mensajes clave',
        'Wireframe inicial y arquitectura de información',
      ],
      isActive: true,
    },
    {
      step: 2,
      title: 'Creación del Demo con IA',
      description: 'Utilizamos IA para crear rápidamente un prototipo funcional de tu landing page',
      detailedDescription:
        'Usando inteligencia artificial y las mejores prácticas de UX/UI, generamos un prototipo funcional de tu landing page. Esta fase incluye la creación de contenido optimizado, selección de paleta de colores, tipografías, imágenes y la estructura visual completa. El demo incluye funcionalidades básicas como formularios de contacto y análisis de datos.',
      duration: '2-3 días hábiles',
      deliverables: [
        'Prototipo funcional navegable',
        'Contenido optimizado generado con IA',
        'Diseño visual con paleta de colores y tipografías',
        'Formularios de contacto configurados',
        'Sistema básico de analytics implementado',
      ],
      isActive: false,
    },
    {
      step: 3,
      title: 'Muestra y Recopilación de Cambios',
      description: 'Te presentamos el demo y recopilamos tus comentarios para ajustes finales',
      detailedDescription:
        'Organizamos una sesión de presentación donde te mostramos el demo completo y explicamos cada elemento de la landing page. Recopilamos todos tus comentarios, sugerencias y cambios necesarios. Esta fase es crucial para asegurar que el resultado final esté perfectamente alineado con tu visión y objetivos de negocio.',
      duration: '1 día hábil',
      deliverables: [
        'Presentación completa del demo',
        'Documento detallado de cambios solicitados',
        'Plan de implementación de ajustes',
        'Cronograma actualizado de entrega',
        'Validación de funcionalidades clave',
      ],
      isActive: false,
    },
    {
      step: 4,
      title: 'Implementación y Lanzamiento',
      description: 'Aplicamos mejoras finales y lanzamos tu landing page en producción',
      detailedDescription:
        'Implementamos todos los cambios solicitados y preparamos la landing page para producción. Esto incluye optimización de rendimiento, configuración de seguridad SSL, configuración de dominio, integración con herramientas de marketing y la puesta en marcha del sistema de analytics avanzado.',
      duration: '2-3 días hábiles',
      deliverables: [
        'Landing page completamente funcional en producción',
        'Certificado SSL y configuración de seguridad',
        'Integración con herramientas de marketing',
        'Sistema de analytics completo configurado',
        'Manual de uso y mantenimiento básico',
      ],
      isActive: false,
    },
    {
      step: 5,
      title: 'Recopilación de Datos',
      description: 'Comenzamos a capturar datos de visitantes para análisis futuros',
      detailedDescription:
        'Una vez lanzada la landing page, iniciamos la recopilación sistemática de datos de comportamiento de visitantes. Configuramos eventos de seguimiento, mapas de calor, análisis de conversión y sistemas de monitoreo de rendimiento. Estos datos serán fundamentales para futuras optimizaciones.',
      duration: 'Continuo desde el lanzamiento',
      deliverables: [
        'Métricas básicas de visitantes y conversiones',
        'Configuración inicial de eventos de seguimiento',
        'Sistema básico de monitoreo de rendimiento',
        'Reporte de lanzamiento con métricas iniciales',
        'Preparación para servicios de análisis avanzado (opcional)',
      ],
      isActive: false,
    },
    {
      step: 6,
      title: 'Optimización Continua',
      description: 'Realizamos pruebas A/B y optimizaciones basadas en datos reales',
      detailedDescription:
        'Con datos suficientes recopilados, iniciamos la fase de optimización continua. Realizamos pruebas A/B de elementos clave como headlines, botones de llamada a la acción, formularios y contenido. Cada optimización se basa en datos reales de comportamiento de tus visitantes para maximizar las conversiones.',
      duration: 'Servicio opcional continuo',
      deliverables: [
        'Análisis detallado de datos de visitantes',
        'Pruebas A/B implementadas y monitoreadas',
        'Reportes de optimizaciones realizadas',
        'Recomendaciones basadas en datos',
        'Incremento medible en tasas de conversión',
      ],
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

  readonly currentDemoData = computed(() => {
    const demos = this.interactiveDemo();
    const currentStep = this.currentDemoStep();
    return demos[currentStep] || demos[0];
  });

  constructor() {
    afterNextRender(() => {
      this._ank.changeDebugOption(true);
      // Configure ngx-angora-css with project colors
      this._ank.pushColors({
        primary: '#0d6efd',
        secondary: '#6c757d',
        success: '#198754',
        info: '#0dcaf0',
        warning: '#ffc107',
        danger: '#dc3545',
        light: '#f8f9fa',
        dark: '#212529',
        accent: '#6f42c1',
        surface: '#ffffff',
        background: '#f8f9fa',
        border: '#dee2e6',
        foreground: '#212529',
        muted: '#6c757d',
        // Additional gray scale colors
        'gray-50': '#f9fafb',
        'gray-100': '#f3f4f6',
        'gray-200': '#e5e7eb',
        'gray-300': '#d1d5db',
        'gray-400': '#9ca3af',
        'gray-500': '#6b7280',
        'gray-600': '#4b5563',
        'gray-700': '#374151',
        'gray-800': '#1f2937',
        'gray-900': '#111827',
      });

      // Configure combos for reusable styles
      this._ank.pushCombos({
        cardHover:
          'ank-transition-all ank-duration-300ms ank-transformHover-translateYSDMIN4pxED ank-boxShadowHover-0__8px__25px__rgbaSD0COM0COM0COM0_15ED',
        btnPrimary:
          'ank-bg-primary ank-color-white ank-px-24px ank-py-12px ank-borderRadius-8px ank-fontWeight-semibold ank-transition-all ank-duration-200ms ank-bgHover-primary ank-transformHover-translateYSDMIN1pxED',
        btnSecondary:
          'ank-bg-transparent ank-color-primary ank-border-2px ank-borderColor-primary ank-px-24px ank-py-12px ank-borderRadius-8px ank-fontWeight-semibold ank-transition-all ank-duration-200ms ank-bgHover-primary ank-colorHover-white',
        sectionPadding: 'ank-py-80px ank-px-20px',
        containerMax: 'ank-maxWidth-1200px ank-mx-auto',
        gridCol3:
          'ank-display-grid ank-gridTemplateColumns-1fr ank-gridTemplateColumns-md-repeatSD2COM1frED ank-gridTemplateColumns-lg-repeatSD3COM1frED ank-gap-32px',
        textGradient:
          'ank-background-linearGradientSD135degCOMaccent 0perCOMprimary 100perED ank-backgroundClip-text ank-color-transparent',
        // Additional utility combos
        'space-y-8px': 'ank-gap-8px',
        'space-y-16px': 'ank-gap-16px',
        'space-y-20px': 'ank-gap-20px',
        'space-y-24px': 'ank-gap-24px',
      });

      this._ank.cssCreate();
    });
  }

  // Interactive methods
  setDemoStep(step: number): void {
    this.currentDemoStep.set(step);

    // Update demo data reactively
    this.interactiveDemo.update(demos =>
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
}
