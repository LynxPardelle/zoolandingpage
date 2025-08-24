import { TestimonialItem } from './testimonials-section.types';

export const TESTIMONIALS_SECTION_ID = 'testimonials';
export const TESTIMONIALS_SECTION_TITLE = 'Lo que Dicen Nuestros Clientes';
export const TESTIMONIALS_SECTION_SUBTITLE = 'Resultados reales de negocios reales';

export function buildTestimonialListSchema(items: readonly TestimonialItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Review',
        reviewBody: t.content,
        reviewRating: { '@type': 'Rating', ratingValue: t.rating, bestRating: 5 },
        author: { '@type': 'Person', name: t.name },
        ...(t.company ? { publisher: { '@type': 'Organization', name: t.company } } : {}),
      },
    })),
  } as const;
}
