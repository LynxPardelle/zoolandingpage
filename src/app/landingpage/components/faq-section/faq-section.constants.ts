import type { AccordionConfig, AccordionItem } from '../../../shared/components/accordion/accordion.types';

export const FAQ_ITEMS: readonly AccordionItem[] = [
  {
    id: 'what-is-landing-page',
    title: '¿Qué es una Landing Page Optimizada?',
    content:
      'Es una página rápida, clara y enfocada en un solo objetivo: convertir visitas en clientes. Incluye medición para saber qué funciona y dónde mejorar.',
  },
  {
    id: 'how-long-takes',
    title: '¿En cuánto tiempo estará lista?',
    content:
      'En días, según contenidos y ajustes. Trabajamos con prototipos rápidos asistidos por IA y revisiones breves para salir a producción cuanto antes.',
  },
  {
    id: 'what-included',
    title: '¿Qué incluye la suscripción?',
    content:
      'Desde 900 MXN/mes: dominio, alojamiento, medición en la nube, soporte y mejoras. Opcionales: versión ES/EN, reportes simples y optimización continua.',
  },
  {
    id: 'price-range',
    title: '¿Puedo usar mi dominio?',
    content:
      'Sí. Conectamos tu dominio actual o te ayudamos a configurarlo desde cero. Incluimos certificado SSL.',
  },
  {
    id: 'support-after',
    title: '¿Cómo veré resultados?',
    content:
      'Como servicio adicional, puedes recibir reportes simples con métricas clave: visitas, clics en CTAs y contactos por WhatsApp.',
  },
  {
    id: 'can-edit',
    title: '¿Puedo tener versión en español e inglés?',
    content:
      'Sí, es opcional. Mostramos el contenido en el idioma preferido del visitante y recordamos su elección.',
  },
  {
    id: 'how-measure',
    title: '¿Qué medimos exactamente?',
    content:
      'Clics en botones principales, contactos por WhatsApp, avance de lectura y secciones con mayor atención. Esto guía mejoras con evidencia.',
  },
  {
    id: 'requirements',
    title: '¿Qué necesito para empezar?',
    content:
      'Una breve descripción de tu negocio, beneficios a destacar, testimonios si tienes y medios de contacto vigentes. Si cuentas con colores de marca, también ayudarán.',
  },
] as const;

export const FAQ_ACCORDION_CONFIG: AccordionConfig = {
  mode: 'single',
  allowToggle: true,
} as const;
