import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Meta, Title } from '@angular/platform-browser';
import { ModalComponent } from '../../../shared/components/modal';
import { ToastComponent, ToastService } from '../../../shared/components/utility/toast';
import { FaqSectionComponent } from '../faq-section/faq-section.component';
import { FeaturesSectionComponent } from '../features-section/features-section.component';
import { FinalCtaSectionComponent } from '../final-cta-section/final-cta-section.component';
import { HeroSectionComponent } from '../hero-section';
import { InteractiveProcessComponent } from '../interactive-process/interactive-process.component';
import { RoiCalculatorSectionComponent } from '../roi-calculator-section/roi-calculator-section.component';
import { RoiNoteComponent } from '../roi-note/roi-note.component';
import { ServicesSectionComponent } from '../services-section/services-section.component';
import { TestimonialsSectionComponent } from '../testimonials-section/testimonials-section.component';
import { buildTestimonialListSchema } from '../testimonials-section/testimonials-section.constants';

import { LanguageService } from '../../../core/services/language.service';
import { AnalyticsCategories, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { StructuredDataService } from '../../../shared/services/structured-data.service';
import type { FeatureCard, InteractiveProcess, ServiceCard, TestimonialCard } from './landing-page.types';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
  templateUrl: './landing-page.component.html',
})
export class LandingPageComponent {
  // SEO services
  private readonly titleSvc = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc: Document = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LanguageService);
  private readonly structured = inject(StructuredDataService);
  private readonly analytics = inject(AnalyticsService);
  readonly currentDemoStep = signal(0);
  readonly isCalculatorVisible = signal(false);
  readonly calculatorBusinessSize = signal<'nano' | 'micro' | 'small' | 'medium'>('micro');
  readonly calculatorIndustry = signal('ecommerce');
  readonly calculatorVisitors = signal(1000);

  // Hero content localized via LanguageService (lightweight i18n until translate service is introduced)
  readonly heroData = computed(() => {
    const es = {
      title: 'Convierte visitas en clientes con una Landing Page rápida, clara y medible',
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
    } as const;
    const en = {
      title: 'Turn visits into customers with a fast, clear and measurable Landing Page',
      subtitle: 'Launch your Optimized Landing Page quickly, measure from day one, and improve with real data.',
      description:
        'Plans starting at 900 MXN/month. Includes domain, hosting and cloud analytics. Brand-aligned design, search-friendly, and clear calls to action to drive contact.',
      primary: { label: 'Chat on WhatsApp', trackLabel: 'cta_whatsapp_hero' },
      secondary: { label: 'See how it works', trackLabel: 'cta_demo_hero' },
      badges: [
        { text: 'More closed deals' },
        { text: 'Loads in < 3s' },
        { text: 'Measurement from day 1' },
        { text: 'ES/EN optional' },
        { text: 'Accessible for everyone' },
      ],
    } as const;
    return this.lang.currentLanguage() === 'es' ? es : en;
  });

  readonly features = computed<readonly FeatureCard[]>(() => {
    if (this.lang.currentLanguage() === 'es') {
      return [
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
      ];
    }
    return [
      {
        icon: 'home',
        title: 'What is an Optimized Landing Page?',
        description:
          'A page focused on a single goal: turning visits into customers. It avoids distractions and guides the visitor to contact or purchase.',
        benefits: [
          'One clear goal: contact, purchase or schedule',
          '3–5x higher conversion than cluttered sites',
          'Straightforward message without noise',
          'CTAs visible at the right moments',
          'Fast load and simple navigation on mobile and desktop',
        ],
      },
      {
        icon: 'filter_alt',
        title: 'Conversion-focused',
        description:
          'Designed as a sales funnel: clear messages, social proof and calls-to-action that move users forward.',
        benefits: [
          'Generates real leads and opportunities',
          'Less friction, more button clicks',
          'Business value over tech jargon',
          'WhatsApp and CTAs always within reach',
          'Ready for ads and social traffic',
        ],
      },
      {
        icon: 'analytics',
        title: 'Measurement from day 1',
        description:
          'We capture visits, clicks, and reading progress. You know what works and where to improve to sell more.',
        benefits: [
          'Key events: CTAs and WhatsApp contact',
          'Reading data: what users see and where they drop',
          'Base for optimizing texts, sections and forms',
        ],
      },
      {
        icon: 'cloud',
        title: 'Powered by Amazon Web Services (AWS)',
        description:
          '24/7 availability and global speed with no own servers. We use AWS, the trusted cloud behind millions of companies.',
        benefits: [
          'Loads in < 3s from anywhere',
          'Security certificate (SSL) included',
          'Auto-scaling for traffic spikes',
          'Global CDN for maximum speed',
          '24/7 monitoring and high availability',
          'Enterprise-grade infrastructure',
        ],
      },
      {
        icon: 'saved_search',
        title: 'Fast, stable and search-ready',
        description:
          'Modern foundation with structured data for better search visibility. Fast, stable and ready to grow.',
        benefits: [
          'Fewer drop-offs on mobile and desktop',
          'Optimization so search engines can find you',
          'SSL certificates and constant availability',
          'Scalable in the cloud when needed',
        ],
      },
      {
        icon: 'psychology',
        title: 'AI-assisted content and improvements',
        description:
          'AI-assisted proposals and copy, always reviewed by humans. More variants and better options faster.',
        benefits: [
          'Data-guided quick iterations',
          'Clear, conversion-oriented copy',
          'Visuals aligned to your brand',
          'Optional continuous optimization',
        ],
      },
    ];
  });
  readonly services = computed<readonly ServiceCard[]>(() => {
    if (this.lang.currentLanguage() === 'es') {
      return [
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
          description:
            'Acompañamiento de principio a fin: contenidos, estilo, publicación y mantenimiento básico.',
          features: [
            'Asesoría de contenidos y estructura',
            'Personalización visual (modo claro/oscuro y colores)',
            'Publicación en servidor confiable con certificados de seguridad (SSL).',
            'Soporte y mejoras constantes.',
          ],
          color: 'accentColor',
        },
      ];
    }
    return [
      {
        icon: 'rocket_launch',
        title: 'Optimized Landing Page',
        description:
          'Launch in days a fast, clear and measurable landing. Designed to turn visits into real customers.',
        features: [
          'Responsive design for mobile, tablet and desktop',
          'Fast loading and smooth experience',
          'Basic SEO and structured data',
          'Measurement from day 1 (clicks and contact)',
          'WhatsApp and CTAs placed strategically',
        ],
        color: 'linkColor',
      },
      {
        icon: 'trending_up',
        title: 'Optimization & Analysis',
        description:
          'Continuous improvement based on real data: A/B tests, content adjustments and impact-first priorities.',
        features: [
          'CTA and sales flow optimization',
          'Actionable recommendations',
          'A/B testing and results-driven changes (optional)',
          'Simple reports with key metrics (optional)',
        ],
        color: 'secondaryAccentColor',
      },
      {
        icon: 'groups',
        title: 'Guidance & Support',
        description: 'Support from start to finish: content, styling, publishing and basic maintenance.',
        features: [
          'Content and structure guidance',
          'Visual customization (light/dark mode and colors)',
          'Publishing on a reliable server with SSL certificates',
          'Ongoing support and improvements',
        ],
        color: 'accentColor',
      },
    ];
  });
  readonly testimonials = computed<readonly TestimonialCard[]>(() => {
    if (this.lang.currentLanguage() === 'es') {
      return [
        {
          name: 'María González',
          role: 'Directora de Marketing',
          company: 'TechStart Solutions',
          content:
            'En tres meses subimos la tasa de conversión y bajó el costo por contacto. Claridad y velocidad marcan la diferencia.',
          rating: 5,
          avatar: '👩‍💼',
          verified: true as any, // type compatibility; downstream accepts optional
        } as any,
        {
          name: 'Carlos Rodríguez',
          role: 'CEO',
          company: 'Innovate Commerce',
          content: 'En 60 días recuperamos la inversión. La medición nos permitió optimizar campañas sin gastar de más.',
          rating: 5,
          avatar: '👨‍💼',
          verified: true as any,
        } as any,
        {
          name: 'Ana Fernández',
          role: 'Fundadora',
          company: 'Creative Studio',
          content:
            'Mensaje claro, pruebas sociales y llamadas a la acción visibles: más consultas reales y mejor seguimiento.',
          rating: 4,
          avatar: '👩‍🎨',
        } as any,
      ];
    }
    return [
      {
        name: 'Mary Gonzalez',
        role: 'Marketing Director',
        company: 'TechStart Solutions',
        content:
          'In three months our conversion rate increased and cost per lead dropped. Clarity and speed made the difference.',
        rating: 5,
        avatar: '👩‍💼',
        verified: true as any,
      } as any,
      {
        name: 'Charles Rodriguez',
        role: 'CEO',
        company: 'Innovate Commerce',
        content:
          'We recovered the investment in 60 days. The measurement helped us optimize campaigns without overspending.',
        rating: 5,
        avatar: '👨‍💼',
        verified: true as any,
      } as any,
      {
        name: 'Anna Fernandez',
        role: 'Founder',
        company: 'Creative Studio',
        content:
          'Clear message, social proof, and visible CTAs: more real inquiries and better follow‑up.',
        rating: 4,
        avatar: '👩‍🎨',
      } as any,
    ];
  });

  readonly testimonialsTitle = computed(() =>
    this.lang.currentLanguage() === 'es' ? 'Resultados que generan confianza' : 'Results that inspire trust'
  );
  readonly testimonialsSubtitle = computed(() =>
    this.lang.currentLanguage() === 'es'
      ? 'Historias breves de clientes que ya están captando clientes de una mejor manera y gastan mejor su presupuesto'
      : 'Brief stories from clients already acquiring better leads and spending smarter'
  );

  readonly finalCta = computed(() =>
    this.lang.currentLanguage() === 'es'
      ? {
        title: 'Publica una landing que vende y aprende con datos reales',
        subtitle: 'Empieza hoy con una Landing Page Optimizada: rápida, clara y medible.\nSuscripción desde 900 MXN/mes.',
        primaryLabel: 'Hablar por WhatsApp',
        secondaryLabel: 'Empieza a vender con tu nueva Landing Page',
      }
      : {
        title: 'Publish a landing that sells and learn from real data',
        subtitle: 'Start today with an Optimized Landing Page: fast, clear, and measurable.\nPlans from 900 MXN/month.',
        primaryLabel: 'Chat on WhatsApp',
        secondaryLabel: 'Start selling with your new Landing Page',
      }
  );
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

  // ROI calculation based on business size, industry and visitors (migrated from legacy App component)
  readonly calculatedROI = computed(() => {
    const businessSize = this.calculatorBusinessSize();
    const industry = this.calculatorIndustry();
    const visitors = this.calculatorVisitors();

    let baseROI = 150;
    let conversionRate = 0.02;

    const sizeMultipliers = {
      nano: { roi: 1.2, conversion: 1.1 },
      micro: { roi: 1.5, conversion: 1.3 },
      small: { roi: 1.8, conversion: 1.5 },
      medium: { roi: 2.2, conversion: 1.7 },
    } as const;

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

    const averageOrderValue =
      businessSize === 'nano' ? 500 : businessSize === 'micro' ? 800 : businessSize === 'small' ? 1200 : 2000;
    const monthlyIncrease = Math.round(visitors * finalConversion * averageOrderValue * 0.3);

    return {
      roiPercentage: finalROI,
      monthlyIncrease,
      conversionImprovement: Math.round((finalConversion / conversionRate) * 10) / 10,
    };
  });

  toggleCalculator(): void {
    this.isCalculatorVisible.update(v => {
      const next = !v;
      this.analytics.track(AnalyticsEvents.RoiToggle, {
        category: AnalyticsCategories.RoiCalculator,
        label: next ? 'open' : 'close',
      });
      return next;
    });
  }
  setDemoStep(step: number): void {
    this.currentDemoStep.set(step);

    // Update demo data reactively
    this.interactiveProcess.update(demos =>
      demos.map(demo => ({
        ...demo,
        isActive: demo.step === step + 1,
      }))
    );
    this.analytics.track(AnalyticsEvents.ProcessStepChange, {
      category: AnalyticsCategories.Process,
      label: String(step + 1),
    });
  }
  updateBusinessSize(size: 'nano' | 'micro' | 'small' | 'medium'): void {
    this.calculatorBusinessSize.set(size);
  }
  updateIndustry(industry: string): void {
    this.calculatorIndustry.set(industry);
  }
  updateVisitors(visitors: number): void {
    this.calculatorVisitors.set(visitors);
    this.analytics.track(AnalyticsEvents.RoiVisitorsChange, {
      category: AnalyticsCategories.RoiCalculator,
      label: visitors.toString(),
      value: visitors,
    });
  }
  openWhatsApp(): void {
    const rawMessage =
      '¡Hola! Me interesa conocer más sobre sus servicios de consultoría tecnológica para landing pages. ¿Podrían ayudarme?';
    const message = encodeURIComponent(rawMessage);
    const phone = '+525522699563';
    const link = `https://wa.me/${ phone }?text=${ message }`;
    // Track whatsapp click (hero or other locations using this helper)
    this.analytics.track(AnalyticsEvents.WhatsAppClick, {
      category: AnalyticsCategories.Engagement,
      label: phone,
      meta: { length: rawMessage.length, location: 'helper' },
    });
    window.open(link, '_blank');
  }
  trackCTAClick(ctaType: string, location: string): void {
    this.analytics.track(AnalyticsEvents.CtaClick, {
      category: AnalyticsCategories.CTA,
      label: `${ location }:${ ctaType }`,
      meta: { location, variant: ctaType },
    });
  }
  trackSectionView(sectionName: string): void {
    this.analytics.track(AnalyticsEvents.SectionView, {
      category: AnalyticsCategories.Navigation,
      label: sectionName,
    });
  }

  // Inject high-level structured data once on component init (browser only)
  constructor() {
    // Reactive SEO/meta updates on language changes
    effect(() => {
      const lang = this.lang.currentLanguage();
      const isEs = lang === 'es';
      const seoTitle = isEs
        ? 'Landing Page Optimizada: Convierte visitas en clientes | ZoolandingPage'
        : 'Optimized Landing Page: Turn visits into customers | ZoolandingPage';
      const seoDesc = isEs
        ? 'Publica una landing rápida, clara y medible. Más cierres de venta, mejores decisiones con datos. Suscripción desde 900 MXN/mes (incluye dominio, alojamiento y medición).'
        : 'Launch a fast, clear and measurable landing. More conversions, better decisions with data. Plans from 900 MXN/month (domain, hosting and analytics included).';

      this.titleSvc.setTitle(seoTitle);
      this.meta.updateTag({ name: 'description', content: seoDesc });

      // Open Graph
      const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : 'https://zoolandingpage.com';
      const url = origin + '/';
      const ogLocale = isEs ? 'es_ES' : 'en_US';
      const ogImage = origin + '/assets/og-1200x630.svg';
      this.meta.updateTag({ property: 'og:title', content: seoTitle });
      this.meta.updateTag({ property: 'og:description', content: seoDesc });
      this.meta.updateTag({ property: 'og:type', content: 'website' });
      this.meta.updateTag({ property: 'og:url', content: url });
      this.meta.updateTag({ property: 'og:image', content: ogImage });
      this.meta.updateTag({ property: 'og:locale', content: ogLocale });
      this.meta.updateTag({ property: 'og:site_name', content: 'Zoo Landing Page' });

      // Twitter Card
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:title', content: seoTitle });
      this.meta.updateTag({ name: 'twitter:description', content: seoDesc });
      this.meta.updateTag({ name: 'twitter:image', content: ogImage });

      // Canonical link
      const head = this.doc.head;
      if (head) {
        let linkEl = head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
        if (!linkEl) {
          linkEl = this.doc.createElement('link');
          linkEl.setAttribute('rel', 'canonical');
          head.appendChild(linkEl);
        }
        linkEl.setAttribute('href', url);
      }
    });
    // Website
    this.structured.injectOnce('sd:website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Zoo Landing Page',
      url: 'https://zoolandingpage.com/',
      inLanguage: this.lang.currentLanguage(),
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://zoolandingpage.com/?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    });
    // Organization
    this.structured.injectOnce('sd:org', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Zoo Landing',
      url: 'https://zoolandingpage.com/',
      logo: 'https://zoolandingpage.com/assets/logo-512x512.svg',
      sameAs: [
        'https://www.facebook.com/',
        'https://www.instagram.com/',
        'https://www.linkedin.com/'
      ],
    });
    // Testimonials as ItemList of Review
    const items = this.testimonials();
    this.structured.injectOnce('sd:testimonials', buildTestimonialListSchema(items as any));

    // Auto section view tracking (browser only)
    try {
      afterNextRender(() => {
        this.setupSectionViewTracking();
        this.setupReadDepthTracking();
      });
    } catch {
      // no-op for SSR
    }
  }

  private setupSectionViewTracking(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }
    const ids = [
      'home',
      'roi-section',
      'features-section',
      'process-section',
      'services-section',
      'roi-calculator-section',
      'testimonials-section',
      'faq-section',
      'contact-section',
    ];
    const lastSeen = new Map<string, number>();
    const initialSeen = new Set<string>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            const id = entry.target.id;
            if (!id) continue;
            const now = Date.now();
            const last = lastSeen.get(id) ?? 0;
            const shouldEmit = now - last > 30_000; // re-emit after 30s since last sighting
            if (shouldEmit) {
              lastSeen.set(id, now);
              if (!initialSeen.has(id)) initialSeen.add(id);
              this.trackSectionView(id);
            }
          }
        }
      },
      { rootMargin: '0px 0px -40% 0px', threshold: [0.1, 0.25, 0.5] }
    );
    const tryObserve = () => {
      ids.forEach(id => {
        const el = this.doc.getElementById(id);
        if (el) observer.observe(el);
      });
    };
    // Initial attempt (some sections might be deferred)
    tryObserve();
    // Re-attach when new nodes are added (for @defer placeholders loading later)
    const mo = new MutationObserver(() => tryObserve());
    mo.observe(this.doc.body, { childList: true, subtree: true });
    // Stop mutation observing once all tracked sections have been seen initially
    const interval = setInterval(() => {
      if (ids.every(id => initialSeen.has(id))) {
        mo.disconnect();
        clearInterval(interval);
      }
    }, 2000);
  }

  private setupReadDepthTracking(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const milestones = [25, 50, 75, 100];
    const hit = new Set<number>();
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.pageYOffset || doc.scrollTop;
      const viewBottom = scrollTop + window.innerHeight;
      const height = doc.scrollHeight || 1;
      const depth = Math.min(100, Math.round((viewBottom / height) * 100));
      for (const m of milestones) {
        if (depth >= m && !hit.has(m)) {
          hit.add(m);
          this.analytics.track(AnalyticsEvents.ScrollDepth, {
            category: AnalyticsCategories.Navigation,
            label: `${ m }%`,
            value: m,
          });
        }
      }
      if (hit.size === milestones.length) window.removeEventListener('scroll', throttled);
    };
    let ticking = false;
    const throttled = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', throttled, { passive: true });
    // Trigger initial check
    onScroll();
  }
}
