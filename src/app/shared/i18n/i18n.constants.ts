import type { TI18nConfig, TLandingPageTranslations, TLanguage } from './i18n.types';

/**
 * Spanish translations for all landing page content
 */
const SPANISH_TRANSLATIONS: TLandingPageTranslations = {
    hero: {
        title: 'Convierte visitas en clientes con una Landing Page rápida, clara y medible',
        subtitle: 'Lanza tu Landing Page Optimizada rápidamente, mide desde el primer día y mejora con datos reales.',
        description: 'Suscripción desde 900 MXN/mes. Incluye dominio, alojamiento y medición en la nube. Diseño alineado a tu marca, optimización para buscadores y llamados a la acción visibles para impulsar el contacto.',
        primary: { label: 'Hablar por WhatsApp', trackLabel: 'cta_whatsapp_hero' },
        secondary: { label: 'Ver cómo funciona', trackLabel: 'cta_demo_hero' },
        badges: [
            { text: 'Más cierres de venta' },
            { text: 'Velocidad con carga en < 3s' },
            { text: 'Medición desde el día 1' },
            { text: 'ES/EN opcional' },
            { text: 'Accesible para todas las personas' },
        ],
        badgesLabel: 'Los distintivos que tendrá tu nueva landing page:',
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
                mobileResponsive: '100% Móvil',
            },
        },
        floatingMetrics: {
            speed: 'Velocidad',
            conversion: 'Conversión',
            seoOptimized: 'SEO Optimizado',
            mobileResponsive: '100% Móvil',
        },
    },
    featuresSection: {
        title: 'Beneficios clave para tu negocio',
        subtitle: 'Claridad, velocidad y medición desde el primer día para convertir visitas en clientes con tu landing page.',
    },
    features: [
        {
            icon: 'home',
            title: '¿Qué es una Landing Page Optimizada?',
            description: 'Es una página enfocada en un solo objetivo: convertir visitas en clientes. Evita distracciones y guía al visitante paso a paso hasta el contacto o la compra.',
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
            description: 'Diseñada como embudo de ventas: mensajes claros, pruebas sociales y llamados a la acción que empujan al siguiente paso.',
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
            description: 'Capturamos visitas, clics y avance de lectura. Sabes qué partes funcionan y dónde mejorar para vender más.',
            benefits: [
                'Eventos clave: llamadas a la acción y contacto por WhatsApp',
                'Datos de lectura: qué ven, qué leen y dónde abandonan',
                'Base para optimizar textos, secciones y formularios',
            ],
        },
        {
            icon: 'cloud',
            title: 'Poder de la Nube con Amazon Web Services (AWS)',
            description: 'Disponibilidad 24/7 y velocidad global sin servidores propios. Usamos AWS, la nube confiable que usan millones de empresas multinacionales.',
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
            description: 'Base moderna con datos estructurados para mejor visibilidad en los buscadores. Rápida, estable y lista para crecer.',
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
            description: 'Propuestas y textos asistidos por IA, siempre revisados por humanos. Más variantes y mejores opciones en menos tiempo.',
            benefits: [
                'Iteraciones rápidas guiadas por datos',
                'Textos claros y orientados a conversión',
                'Visuales alineados a tu marca',
                'Optimización continua opcional',
            ],
        },
    ],
    services: [
        {
            icon: 'rocket_launch',
            title: 'Landing Page Optimizada',
            description: 'Publica en días una landing rápida, clara y medible. Diseñada para convertir visitas en clientes reales.',
            features: [
                'Diseño adaptable a móvil, tablet y escritorio',
                'Carga rápida y experiencia fluida',
                'SEO básico y datos estructurados',
                'Medición desde el día 1 (clics y contacto)',
                'WhatsApp y llamadas a la acción estratégicamente ubicados',
            ],
            color: 'linkColor',
            buttonLabel: 'Pedir información'
        },
        {
            icon: 'trending_up',
            title: 'Optimización y análisis',
            description: 'Mejora continua con base en datos reales: pruebas A/B, ajustes de contenido y priorización por impacto.',
            features: [
                'Optimización de llamadas a la acción y flujo de ventas',
                'Recomendaciones accionables',
                'Pruebas A/B y cambios orientados a resultados (extra)',
                'Reportes simples con métricas clave (extra)',
            ],
            color: 'secondaryAccentColor',
            buttonLabel: 'Pedir información'
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
            buttonLabel: 'Pedir información'
        },
    ],
    testimonials: [
        {
            name: 'María González',
            role: 'Directora de Marketing',
            company: 'TechStart Solutions',
            content: 'En tres meses subimos la tasa de conversión y bajó el costo por contacto. Claridad y velocidad marcan la diferencia.',
            rating: 5,
            avatar: '👩‍💼',
            verified: true,
        },
        {
            name: 'Carlos Rodríguez',
            role: 'CEO',
            company: 'Innovate Commerce',
            content: 'En 60 días recuperamos la inversión. La medición nos permitió optimizar campañas sin gastar de más.',
            rating: 5,
            avatar: '👨‍💼',
            verified: true,
        },
        {
            name: 'Ana Fernández',
            role: 'Fundadora',
            company: 'Creative Studio',
            content: 'Mensaje claro, pruebas sociales y llamadas a la acción visibles: más consultas reales y mejor seguimiento.',
            rating: 4,
            avatar: '👩‍🎨',
        },
    ],
    processSection: {
        title: 'Cómo lo hacemos',
        sidebarTitle: 'Nuestro Proceso',
        detailedDescriptionLabel: 'Descripción Detallada:',
        deliverablesLabel: 'Entregables:',
    },
    process: [
        {
            step: 1,
            title: 'Descubrimiento',
            description: 'Entendemos objetivos, propuesta de valor y a quién quieres llegar.',
            detailedDescription: 'Reunión breve para conocer tu negocio, propuesta de valor y audiencia. Definimos mensajes y priorizamos lo esencial para lanzar rápido.',
            duration: '1-3 días hábiles',
            deliverables: ['Resumen claro de objetivos', 'Mensajes clave y estructura sugerida', 'Checklist de requisitos'],
            isActive: true,
        },
        {
            step: 2,
            title: 'Prototipo rápido con IA',
            description: 'Te mostramos un demo navegable con textos y diseño inicial.',
            detailedDescription: 'IA + revisión humana para un demo con textos, colores y estructura visual. Verás cómo quedaría tu landing.',
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
            detailedDescription: 'Retroalimentación breve, priorizamos cambios de mayor impacto para alinear mensaje y diseño.',
            duration: '1-5 días hábiles',
            deliverables: ['Lista de cambios priorizados', 'Plan breve para implementar mejoras'],
            isActive: false,
        },
        {
            step: 4,
            title: 'Lanzamiento',
            description: 'Publicamos tu landing con medición activa y SEO básico.',
            detailedDescription: 'Ajustes finales, conexión de dominio, certificados de seguridad (SSL) activos y verificación de medición.',
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
    ],
    faqSection: {
        footerQuestion: '¿Tienes alguna otra pregunta?',
        footerButtonLabel: 'Contacta con nosotros',
        placeholderQuestions: [
            '¿Qué es una landing page y por qué la necesito?',
            '¿Cuánto tiempo toma crear mi landing page?',
            '¿Qué incluye el servicio completo?',
            '¿Cuál es el rango de precios?',
        ],
    },
    faq: [
        {
            id: 'what-is-landing-page',
            title: '¿Qué es una Landing Page Optimizada?',
            content: 'Es una página rápida, clara y enfocada en un solo objetivo: convertir visitas en clientes. Incluye medición para saber qué funciona y dónde mejorar.',
        },
        {
            id: 'how-long-takes',
            title: '¿En cuánto tiempo estará lista?',
            content: 'En días, según contenidos y ajustes. Trabajamos con prototipos rápidos asistidos por IA y revisiones breves para salir a producción cuanto antes.',
        },
        {
            id: 'what-included',
            title: '¿Qué incluye la suscripción?',
            content: 'Desde 900 MXN/mes: dominio, alojamiento, medición en la nube, soporte y mejoras. Opcionales: versión ES/EN, reportes simples y optimización continua.',
        },
        {
            id: 'price-range',
            title: '¿Puedo usar mi dominio?',
            content: 'Sí. Conectamos tu dominio actual o te ayudamos a configurarlo desde cero. Incluimos certificado SSL.',
        },
        {
            id: 'support-after',
            title: '¿Cómo veré resultados?',
            content: 'Como servicio adicional, puedes recibir reportes simples con métricas clave: visitas, clics en CTAs y contactos por WhatsApp.',
        },
        {
            id: 'can-change-language',
            title: '¿Puedo tener versión en español e inglés?',
            content: 'Sí, es opcional. Mostramos el contenido en el idioma preferido del visitante y recordamos su elección.',
        },
        {
            id: 'how-measure',
            title: '¿Qué medimos exactamente?',
            content: 'Clics en botones principales, contactos por WhatsApp, avance de lectura y secciones con mayor atención. Esto guía mejoras con evidencia.',
        },
        {
            id: 'requirements',
            title: '¿Qué necesito para empezar?',
            content: 'Una breve descripción de tu negocio, beneficios a destacar, testimonios si tienes y medios de contacto vigentes. Si cuentas con colores de marca, también ayudarán.',
        },
    ],
    conversionNote: {
        title: '¿Qué significa una mejora en conversión?',
        question: '¿Qué significa una mejora en conversión?',
        investmentLabel: 'Visitas',
        investmentValue: '1,000',
        totalReturnLabel: 'Acciones clave',
        totalReturnValue: '3.5x más',
        explanation: 'Es una estimación basada en datos de la industria y casos comparables. Medimos desde el día 1 para validar con datos reales y priorizar mejoras.',
        conversionDescription: 'Un aumento del <strong class="ank-color-secondaryAccentColor">+350%</strong> en conversión indica un rendimiento significativamente mayor de tus visitas: más clics en llamadas a la acción y más contactos reales con el mismo presupuesto.',
    },
    statsStrip: {
        title: 'Resultados reales, medidos',
        subtitle: 'Métricas clave de tu embudo de ventas',
        description: 'Seguimos visitas, clics en llamados a la acción y tiempo promedio de permanencia para priorizar mejoras con datos.',
        visitsLabel: 'Visitas a la landing',
        ctaInteractionsLabel: 'Interacciones con CTAs',
        averageTimeLabel: 'Tiempo promedio en la landing',
    },
    calculator: {
        title: 'Calculadora de Conversión',
        subtitle: 'Estima el impacto en conversiones y ventas con tu propia configuración',
        description: 'Basada en promedios del sector y casos reales; ajusta tamaño, industria y visitas para simular.',
        businessSizeLabels: {
            nano: { title: 'Nano Empresa', description: '1-2 empleados' },
            micro: { title: 'Micro Empresa', description: '3-10 empleados' },
            small: { title: 'Pequeña Empresa', description: '11-50 empleados' },
            medium: { title: 'Mediana Empresa', description: '51-250 empleados' },
        },
        industryLabels: {
            ecommerce: 'E-commerce',
            services: 'Servicios Profesionales',
            restaurant: 'Restaurante',
            health: 'Salud',
            education: 'Educación',
            'real-estate': 'Bienes Raíces',
            consulting: 'Consultoría',
        },
        visitorsLabel: 'Visitantes mensuales',
        resultsTitle: 'Resultados Estimados',
        monthlyIncreaseLabel: 'Ingresos adicionales mensuales',
        conversionImprovementLabel: 'Mejora de conversión estimada',
    },
    finalCtaSection: {
        title: 'Publica una landing que vende y aprende con datos reales',
        subtitle: 'Empieza hoy con una Landing Page Optimizada: rápida, clara y medible.\nSuscripción desde 900 MXN/mes.',
        primaryLabel: 'Hablar por WhatsApp',
        secondaryLabel: 'Ver cómo funciona',
        trustSignals: {
            first: '⭐ Medición desde el día 1 • 🔒 SSL y hosting incluido • ⚡ Entrega rápida',
            second: ['💬 Soporte continuo', '📊 Reportes simples opcionales', '🌐 Optimización para buscadores'],
        },
    },
    ui: {
        sections: {
            services: {
                title: 'Servicios para vender más',
                subtitle: 'De la publicación rápida a la mejora continua basada en datos',
                cta: 'Pedir información',
            },
            testimonials: {
                title: 'Resultados que generan confianza',
                subtitle: 'Historias breves de clientes que ya están captando clientes de una mejor manera y gastan mejor su presupuesto',
            },
            faq: {
                title: 'Preguntas Frecuentes',
                subtitle: 'Resolvemos las dudas más comunes sobre nuestro servicio de landing pages',
            },
            finalCta: {
                title: 'Publica una landing que vende y aprende con datos reales',
                subtitle: 'Empieza hoy con una Landing Page Optimizada: rápida, clara y medible.\nSuscripción desde 900 MXN/mes.',
                primaryLabel: 'Hablar por WhatsApp',
                secondaryLabel: 'Empieza a vender con tu nueva Landing Page',
            },
        },
        loading: {
            calculator: 'Calculando Conversión…',
            testimonials: 'Cargando testimonios…',
            faq: 'Cargando preguntas frecuentes…',
        },
        contact: {
            label: 'CONTACTO',
            whatsappMessage: '¡Hola! Me interesa conocer más sobre sus servicios de consultoría tecnológica para landing pages. ¿Podrían ayudarme?',
        },
    },
};

/**
 * English translations for all landing page content
 */
const ENGLISH_TRANSLATIONS: TLandingPageTranslations = {
    hero: {
        title: 'Turn visits into customers with a fast, clear and measurable Landing Page',
        subtitle: 'Launch your Optimized Landing Page quickly, measure from day one, and improve with real data.',
        description: 'Plans starting at 900 MXN/month. Includes domain, hosting and cloud analytics. Brand-aligned design, search-friendly, and clear calls to action to drive contact.',
        primary: { label: 'Chat on WhatsApp', trackLabel: 'cta_whatsapp_hero' },
        secondary: { label: 'See how it works', trackLabel: 'cta_demo_hero' },
        badges: [
            { text: 'More closed deals' },
            { text: 'Loads in < 3s' },
            { text: 'Measurement from day 1' },
            { text: 'ES/EN optional' },
            { text: 'Accessible for everyone' },
        ],
        badgesLabel: 'The features your new landing page will have:',
        mockup: {
            url: '🔒 https://your-business.com',
            logo: 'LOGO',
            contact: 'CONTACT',
            buyButton: 'BUY',
            demoButton: 'DEMO',
            ctaButton: 'REQUEST INFO',
            badges: {
                conversion: 'Conversion',
                speed: 'Speed',
                seoOptimized: 'SEO Optimized',
                mobileResponsive: '100% Mobile',
            },
        },
        floatingMetrics: {
            speed: 'Speed',
            conversion: 'Conversion',
            seoOptimized: 'SEO Optimized',
            mobileResponsive: '100% Mobile',
        },
    },
    featuresSection: {
        title: 'Key benefits for your business',
        subtitle: 'Clarity, speed and measurement from day one to convert visits into customers with your landing page.',
    },
    features: [
        {
            icon: 'home',
            title: 'What is an Optimized Landing Page?',
            description: 'A page focused on a single goal: turning visits into customers. It avoids distractions and guides the visitor to contact or purchase.',
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
            description: 'Designed as a sales funnel: clear messages, social proof and calls-to-action that move users forward.',
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
            description: 'We capture visits, clicks, and reading progress. You know what works and where to improve to sell more.',
            benefits: [
                'Key events: CTAs and WhatsApp contact',
                'Reading data: what users see and where they drop',
                'Base for optimizing texts, sections and forms',
            ],
        },
        {
            icon: 'cloud',
            title: 'Powered by Amazon Web Services (AWS)',
            description: '24/7 availability and global speed with no own servers. We use AWS, the trusted cloud behind millions of companies.',
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
            description: 'Modern foundation with structured data for better search visibility. Fast, stable and ready to grow.',
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
            description: 'AI-assisted proposals and copy, always reviewed by humans. More variants and better options faster.',
            benefits: [
                'Data-guided quick iterations',
                'Clear, conversion-oriented copy',
                'Visuals aligned to your brand',
                'Optional continuous optimization',
            ],
        },
    ],
    services: [
        {
            icon: 'rocket_launch',
            title: 'Optimized Landing Page',
            description: 'Launch in days a fast, clear and measurable landing. Designed to turn visits into real customers.',
            features: [
                'Responsive design for mobile, tablet and desktop',
                'Fast loading and smooth experience',
                'Basic SEO and structured data',
                'Measurement from day 1 (clicks and contact)',
                'WhatsApp and CTAs placed strategically',
            ],
            color: 'linkColor',
            buttonLabel: 'Request info'
        },
        {
            icon: 'trending_up',
            title: 'Optimization & Analysis',
            description: 'Continuous improvement based on real data: A/B tests, content adjustments and impact-first priorities.',
            features: [
                'CTA and sales flow optimization',
                'Actionable recommendations',
                'A/B testing and results-driven changes (optional)',
                'Simple reports with key metrics (optional)',
            ],
            color: 'secondaryAccentColor',
            buttonLabel: 'Request info'
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
            buttonLabel: 'Request info'
        },
    ],
    testimonials: [
        {
            name: 'Mary Gonzalez',
            role: 'Marketing Director',
            company: 'TechStart Solutions',
            content: 'In three months our conversion rate increased and cost per lead dropped. Clarity and speed made the difference.',
            rating: 5,
            avatar: '👩‍💼',
            verified: true,
        },
        {
            name: 'Charles Rodriguez',
            role: 'CEO',
            company: 'Innovate Commerce',
            content: 'We recovered the investment in 60 days. The measurement helped us optimize campaigns without overspending.',
            rating: 5,
            avatar: '👨‍💼',
            verified: true,
        },
        {
            name: 'Anna Fernandez',
            role: 'Founder',
            company: 'Creative Studio',
            content: 'Clear message, social proof, and visible CTAs: more real inquiries and better follow‑up.',
            rating: 4,
            avatar: '👩‍🎨',
        },
    ],
    processSection: {
        title: 'How we do it',
        sidebarTitle: 'Our Process',
        detailedDescriptionLabel: 'Detailed Description:',
        deliverablesLabel: 'Deliverables:',
    },
    process: [
        {
            step: 1,
            title: 'Discovery',
            description: 'We understand your goals, value proposition and target audience.',
            detailedDescription: 'Brief meeting to learn about your business, value proposition and audience. We define messages and prioritize essentials for quick launch.',
            duration: '1-3 business days',
            deliverables: ['Clear summary of objectives', 'Key messages and suggested structure', 'Requirements checklist'],
            isActive: true,
        },
        {
            step: 2,
            title: 'AI-powered rapid prototype',
            description: 'We show you a navigable demo with texts and initial design.',
            detailedDescription: 'AI + human review for a demo with texts, colors and visual structure. You\'ll see how your landing would look.',
            duration: '3-5 business days',
            deliverables: [
                'Navigable demo',
                'Conversion-oriented texts',
                'Base design and styles',
                'Basic measurement ready from the start',
            ],
            isActive: false,
        },
        {
            step: 3,
            title: 'Review and changes',
            description: 'We review together and adjust what impacts results the most.',
            detailedDescription: 'Brief feedback, we prioritize highest-impact changes to align message and design.',
            duration: '1-5 business days',
            deliverables: ['Prioritized change list', 'Brief plan to implement improvements'],
            isActive: false,
        },
        {
            step: 4,
            title: 'Launch',
            description: 'We publish your landing with active measurement and basic SEO.',
            detailedDescription: 'Final adjustments, domain connection, active security certificates (SSL) and measurement verification.',
            duration: '2-3 business days',
            deliverables: [
                'Published and reviewed landing',
                'Active security certificates (SSL) and basic SEO',
                'Click and contact measurement',
            ],
            isActive: false,
        },
        {
            step: 5,
            title: 'Real data',
            description: 'We analyze results and propose actionable improvements.',
            detailedDescription: 'We monitor clicks and contacts. We share simple report and suggestions for improvement.',
            duration: 'From launch',
            deliverables: [
                'Click and contact metrics',
                'Simple results report',
                'Initial improvement suggestions',
                'Optional: preparation for advanced analysis',
            ],
            isActive: false,
        },
        {
            step: 6,
            title: 'Continuous improvement (optional)',
            description: 'We test changes and improve based on data.',
            detailedDescription: 'We continue testing variants and applying improvements based on results to attract more customers.',
            duration: 'Optional ongoing service',
            deliverables: ['Documented tests and results', 'List of suggested improvements'],
            isActive: false,
        },
    ],
    faqSection: {
        footerQuestion: 'Do you have any other questions?',
        footerButtonLabel: 'Contact us',
        placeholderQuestions: [
            'What is a landing page and why do I need it?',
            'How long does it take to create my landing page?',
            'What does the complete service include?',
            'What is the price range?',
        ],
    },
    faq: [
        {
            id: 'what-is-landing-page',
            title: 'What is an Optimized Landing Page?',
            content: 'It\'s a fast, clear page focused on a single goal: converting visits into customers. Includes measurement to know what works and where to improve.',
        },
        {
            id: 'how-long-takes',
            title: 'How long will it take to be ready?',
            content: 'In days, depending on content and adjustments. We work with AI-assisted rapid prototypes and brief reviews to go to production as soon as possible.',
        },
        {
            id: 'what-included',
            title: 'What does the subscription include?',
            content: 'From 900 MXN/month: domain, hosting, cloud measurement, support and improvements. Optional: ES/EN version, simple reports and continuous optimization.',
        },
        {
            id: 'price-range',
            title: 'Can I use my domain?',
            content: 'Yes. We connect your current domain or help you set it up from scratch. We include SSL certificate.',
        },
        {
            id: 'support-after',
            title: 'How will I see results?',
            content: 'As an additional service, you can receive simple reports with key metrics: visits, CTA clicks and WhatsApp contacts.',
        },
        {
            id: 'can-change-language',
            title: 'Can I have a Spanish and English version?',
            content: 'Yes, it\'s optional. We show content in the visitor\'s preferred language and remember their choice.',
        },
        {
            id: 'how-measure',
            title: 'What exactly do we measure?',
            content: 'Clicks on main buttons, WhatsApp contacts, reading progress and sections with most attention. This guides improvements with evidence.',
        },
        {
            id: 'requirements',
            title: 'What do I need to get started?',
            content: 'A brief description of your business, benefits to highlight, testimonials if you have them and current contact methods. If you have brand colors, they will also help.',
        },
    ],
    conversionNote: {
        title: 'What does a conversion improvement mean?',
        question: 'What does a conversion improvement mean?',
        investmentLabel: 'Visits',
        investmentValue: '1,000',
        totalReturnLabel: 'Key Actions',
        totalReturnValue: '3.5x',
        explanation: 'It\'s an estimate based on industry data and comparable cases. We measure from day 1 to validate with real data and prioritize improvements.',
        conversionDescription: 'A <strong class="ank-color-secondaryAccentColor">+350%</strong> increase in conversion indicates significantly higher performance from your visits: more clicks on calls to action and more real contacts with the same budget.',
    },
    statsStrip: {
        title: 'Real, measured results',
        subtitle: 'Key metrics in your funnel',
        description: 'We track visits, CTA clicks and average time on page to prioritize improvements with data.',
        visitsLabel: 'Landing visits',
        ctaInteractionsLabel: 'CTA interactions',
        averageTimeLabel: 'Average time on landing',
    },
    calculator: {
        title: 'Conversion Calculator',
        subtitle: 'Estimate the impact on conversions and sales with your own setup',
        description: 'Based on industry averages and real cases; adjust size, industry, and visitors to simulate.',
        businessSizeLabels: {
            nano: { title: 'Nano Business', description: '1-2 employees' },
            micro: { title: 'Micro Business', description: '3-10 employees' },
            small: { title: 'Small Business', description: '11-50 employees' },
            medium: { title: 'Medium Business', description: '51-250 employees' },
        },
        industryLabels: {
            ecommerce: 'E-commerce',
            services: 'Professional Services',
            restaurant: 'Restaurant',
            health: 'Health',
            education: 'Education',
            'real-estate': 'Real Estate',
            consulting: 'Consulting',
        },
        visitorsLabel: 'Monthly visitors',
        resultsTitle: 'Estimated Results',
        monthlyIncreaseLabel: 'Additional monthly revenue',
        conversionImprovementLabel: 'Estimated conversion improvement',
    },
    finalCtaSection: {
        title: 'Publish a landing page that sells and learn with real data',
        subtitle: 'Start today with an Optimized Landing Page: fast, clear and measurable.\nSubscription from 900 MXN/month.',
        primaryLabel: 'Talk on WhatsApp',
        secondaryLabel: 'See how it works',
        trustSignals: {
            first: '⭐ Measurement from day 1 • 🔒 SSL and hosting included • ⚡ Fast delivery',
            second: ['💬 Continuous support', '📊 Optional simple reports', '🌐 Search engine optimization'],
        },
    },
    ui: {
        sections: {
            services: {
                title: 'Services to sell more',
                subtitle: 'From quick publishing to continuous improvement based on data',
                cta: 'Request info',
            },
            testimonials: {
                title: 'Results that inspire trust',
                subtitle: 'Brief stories from clients already acquiring better leads and spending smarter',
            },
            faq: {
                title: 'Frequently Asked Questions',
                subtitle: 'We resolve the most common questions about our landing page service',
            },
            finalCta: {
                title: 'Publish a landing that sells and learn from real data',
                subtitle: 'Start today with an Optimized Landing Page: fast, clear, and measurable.\nPlans from 900 MXN/month.',
                primaryLabel: 'Chat on WhatsApp',
                secondaryLabel: 'Start selling with your new Landing Page',
            },
        },
        loading: {
            calculator: 'Calculating Conversion…',
            testimonials: 'Loading testimonials…',
            faq: 'Loading frequently asked questions…',
        },
        contact: {
            label: 'CONTACT',
            whatsappMessage: 'Hello! I\'m interested in learning more about your technology consulting services for landing pages. Could you help me?',
        },
    },
};

/**
 * Complete internationalization configuration
 */
export const I18N_CONFIG: TI18nConfig = {
    currentLanguage: 'es',
    translations: {
        es: SPANISH_TRANSLATIONS,
        en: ENGLISH_TRANSLATIONS,
    },
};

/**
 * Get translation for current language
 */
export function getTranslations(language: TLanguage): TLandingPageTranslations {
    return I18N_CONFIG.translations[language];
}

/**
 * Get translation by key path (for type safety)
 */
export function getTranslation<T>(
    language: TLanguage,
    keyPath: string
): T {
    const translations = getTranslations(language);
    const keys = keyPath.split('.');

    let result: any = translations;
    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            console.warn(`Translation key not found: ${ keyPath }`);
            return keyPath as unknown as T;
        }
    }

    return result;
}
