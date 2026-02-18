import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";
import { AnalyticsEvents } from "../analytics.events";
import type { ComponentEvent } from "../component-event-dispatcher.service";
import { I18nService } from "../i18n.service";

type CardsStoreParams = {
    globalI18n: I18nService;
    onComponentEvent: (event: ComponentEvent) => void;
};

export const createCards = ({
    globalI18n,
    onComponentEvent,
}: CardsStoreParams): TGenericComponent[] => {
    return [
        /* Features Section */
        ...Array.from({ length: 6 }, (_unused: unknown, index: number) => ({
            id: `featuresCard${ index + 1 }`,
            type: 'feature-card',
            condition: `all:i18n,features.${ index }`,
            valueInstructions: `set:config.icon,i18nGetIndex,features,${ index },icon; set:config.title,i18nGetIndex,features,${ index },title; set:config.description,i18nGetIndex,features,${ index },description; set:config.benefits,i18nGetIndex,features,${ index },benefits`,
            config: {
                icon: '',
                title: '',
                description: '',
                benefits: [],
                classes:
                    'ank-bg-secondaryBgColor ank-borderRadius-1rem ank-p-1_5rem cardHover ank-textAlign-center ank-border-1px ank-borderColor-border ank-h-calcSD100per__MIN__3remED',
            },
        })) as TGenericComponent[],

        /* Services Section */
        ...Array.from({ length: 3 }, (_unused: unknown, index: number) => ({
            id: `servicesCard${ index + 1 }`,
            type: 'feature-card',
            condition: `all:i18n,services.${ index }`,
            valueInstructions: `set:config.icon,i18nGetIndex,services,${ index },icon; set:config.title,i18nGetIndex,services,${ index },title; set:config.description,i18nGetIndex,services,${ index },description; set:config.benefits,i18nGetIndex,services,${ index },features; set:config.buttonLabel,i18nGetIndex,services,${ index },buttonLabel`,
            config: {
                icon: '',
                title: '',
                description: '',
                benefits: [],
                buttonLabel: '',
                onCta: (title: string) =>
                    onComponentEvent({
                        componentId: `servicesCard${ index + 1 }`,
                        eventName: 'cta',
                        meta_title: AnalyticsEvents.ServicesCtaClick,
                        eventData: { label: title },
                        eventInstructions: 'openWhatsApp:event.meta_title,services,event.eventData.label',
                    }),
                classes:
                    'ank-bg-secondaryBgColor ank-borderRadius-1rem ank-p-1_5rem cardHover ank-textAlign-center ank-border-1px ank-borderColor-border ank-h-calcSD100per__MIN__3remED',
            },
        })) as TGenericComponent[],

        /* Testimonials Section */
        ...Array.from({ length: 3 }, (_unused: unknown, index: number) => ({
            id: `testimonialsCard${ index + 1 }`,
            type: 'testimonial-card',
            condition: `all:i18n,testimonials.${ index }`,
            valueInstructions: `set:config.name,i18nGetIndex,testimonials,${ index },name; set:config.role,i18nGetIndex,testimonials,${ index },role; set:config.company,i18nGetIndex,testimonials,${ index },company; set:config.content,i18nGetIndex,testimonials,${ index },content; set:config.rating,i18nGetIndex,testimonials,${ index },rating,5`,
            config: {
                name: '',
                role: '',
                company: '',
                content: '',
                rating: 5,
                avatar: (globalI18n.getOr('testimonials', []) as any[])[index]?.avatar,
            },
        })) as TGenericComponent[]
    ];
};
