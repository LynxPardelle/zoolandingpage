import { HeroSectionData } from './hero-section.types';
export const HERO_SECTION_DEFAULT: HeroSectionData = {
  title: 'Título Principal',
  subtitle: 'Subtítulo descriptivo',
  description: '',
  primary: { label: 'Acción Primaria' },
  secondary: { label: 'Acción Secundaria' },
  badges: [],
  mockup: {
    url: '🔒 https://tu-negocio.com',
    logo: 'LOGO',
    contact: 'CONTACTO',
    buyButton: 'COMPRAR',
    demoButton: 'DEMO',
    ctaButton: 'SOLICITAR INFO',
    badges: {
      conversion: 'Conversión',
      speed: 'Velocidad',
      seoOptimized: 'SEO Optimizado',
      mobileResponsive: '100% Móvil'
    }
  }
};
export const HERO_SECTION_BASE_CLASSES = [
  'ank-minHeight-100vh',
  'ank-display-flex',
  'ank-alignItems-center',
  'ank-justifyContent-center',
];
