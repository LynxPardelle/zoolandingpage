import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
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
  private readonly toast = inject(ToastService);
  readonly currentDemoStep = signal(0);
  readonly isCalculatorVisible = signal(false);
  readonly calculatorBusinessSize = signal<'nano' | 'micro' | 'small' | 'medium'>('micro');
  readonly calculatorIndustry = signal('ecommerce');
  readonly calculatorVisitors = signal(1000);

  readonly heroData = signal({
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
    this.isCalculatorVisible.update(v => !v);
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
      '¡Hola! Me interesa conocer más sobre sus servicios de consultoría tecnológica para landing pages. ¿Podrían ayudarme?'
    );
    window.open(`https://wa.me/+525522699563?text=${ message }`, '_blank');
  }
  trackCTAClick(ctaType: string, location: string): void {
    if (environment.features.analytics) {
      // eslint-disable-next-line no-console
      console.log(`CTA clicked: ${ ctaType } at ${ location }`);
    }
  }
  trackSectionView(sectionName: string): void {
    if (environment.features.analytics) {
      console.log(`Section viewed: ${ sectionName }`);
      // Here would go actual analytics tracking
    }
  }
}
