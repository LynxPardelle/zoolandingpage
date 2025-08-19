import type { AccordionConfig, AccordionItem } from '../../../shared/components/accordion/accordion.types';

export const FAQ_ITEMS: readonly AccordionItem[] = [
  {
    id: 'what-is-landing-page',
    title: '¿Qué es una landing page y por qué la necesito?',
    content:
      'Una landing page es una página web diseñada específicamente para convertir visitantes en clientes. A diferencia de tu sitio web principal, está enfocada en un solo objetivo: generar ventas, leads o suscripciones. Nuestras landing pages aumentan las conversiones hasta un 300% comparado con páginas web tradicionales.',
  },
  {
    id: 'how-long-takes',
    title: '¿Cuánto tiempo toma crear mi landing page?',
    content:
      'El proceso completo toma entre 7-14 días hábiles. Esto incluye: consultoría inicial (1-2 días), diseño y desarrollo (5-7 días), revisiones (2-3 días), y optimizaciones finales (1-2 días). Te mantenemos informado en cada etapa del proceso.',
  },
  {
    id: 'what-included',
    title: '¿Qué incluye el servicio completo?',
    content:
      'Incluye diseño responsivo, optimización SEO, análisis de conversiones, integración con herramientas de marketing, hosting por 1 año, certificado SSL, soporte técnico, y hasta 3 rondas de revisiones. También configuramos tracking de analytics y píxeles de Facebook/Google.',
  },
  {
    id: 'price-range',
    title: '¿Cuál es el rango de precios?',
    content:
      'Nuestros paquetes van desde $1,500 hasta $5,000 USD, dependiendo de la complejidad y características requeridas. Ofrecemos planes de pago flexibles y garantía de satisfacción. El ROI promedio de nuestros clientes es del 450% en los primeros 6 meses.',
  },
  {
    id: 'support-after',
    title: '¿Qué soporte recibo después del lanzamiento?',
    content:
      'Incluimos 3 meses de soporte técnico gratuito, actualizaciones de seguridad, backup diario, monitoreo de rendimiento, y un reporte mensual de métricas. Después puedes contratar nuestro plan de mantenimiento desde $200/mes.',
  },
  {
    id: 'can-edit',
    title: '¿Podré editar el contenido yo mismo?',
    content:
      'Sí, entregamos un panel de administración intuitivo donde puedes editar textos, imágenes, precios y contenido básico sin conocimientos técnicos. También incluimos un video tutorial personalizado y 1 hora de capacitación en vivo.',
  },
  {
    id: 'guarantee',
    title: '¿Ofrecen alguna garantía?',
    content:
      'Ofrecemos garantía de satisfacción 100%. Si no estás completamente satisfecho en los primeros 30 días, te devolvemos tu dinero. También garantizamos que tu landing page cargará en menos de 3 segundos y será 100% responsive.',
  },
  {
    id: 'industries',
    title: '¿Trabajan con mi industria específica?',
    content:
      'Trabajamos con todas las industrias: e-commerce, servicios profesionales, consultorías, coaches, restaurantes, inmobiliarias, salud, educación, y más. Tenemos experiencia creando landing pages para más de 50 nichos diferentes con casos de éxito comprobados.',
  },
] as const;

export const FAQ_ACCORDION_CONFIG: AccordionConfig = {
  mode: 'single',
  allowToggle: true,
} as const;
