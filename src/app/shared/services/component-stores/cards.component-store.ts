import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";
import { AnalyticsEvents } from "../analytics.events";
export const cards: TGenericComponent[] = [
    {
        id: 'featuresCardTemplate',
        type: 'feature-card',
        config: {
            icon: '',
            title: '',
            description: '',
            benefits: [],
            classes:
                'ank-bg-secondaryBgColor ank-borderRadius-1rem ank-p-1_5rem cardHover ank-textAlign-center ank-border-1px ank-borderColor-border ank-h-calcSD100per__MIN__3remED',
        },
    },
    {
        id: 'servicesCardTemplate',
        type: 'feature-card',
        meta_title: String(AnalyticsEvents.ServicesCtaClick),
        eventInstructions: 'openWhatsApp:event.meta_title,services,event.eventData.label',
        config: {
            icon: '',
            title: '',
            description: '',
            benefits: [],
            buttonLabel: '',
            classes:
                'ank-bg-secondaryBgColor ank-borderRadius-1rem ank-p-1_5rem cardHover ank-textAlign-center ank-border-1px ank-borderColor-border ank-h-calcSD100per__MIN__3remED',
        },
    },
    {
        id: 'testimonialsCardTemplate',
        type: 'testimonial-card',
        config: {
            name: '',
            role: '',
            company: '',
            content: '',
            rating: 5,
            avatar: '',
        },
    },
];
