import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";
import { AnalyticsEvents } from "../analytics.events";

type InteractiveProcessStoreParams = {
    currentStep: () => number;
};

export const createInteractiveProcesses = ({
    currentStep,
}: InteractiveProcessStoreParams): TGenericComponent[] => [
        {
            id: 'interactiveProcessSection',
            type: 'container',
            condition: 'all:host,hasValidInteractiveProcessConfig',
            config: {
                id: 'process-section',
                tag: 'div',
                classes: '',
                components: ['interactiveProcess'],
            },
        },
        {
            id: 'interactiveProcess',
            type: 'interactive-process',
            eventInstructions: 'setInteractiveProcessStep:event.eventData',
            meta_title: String(AnalyticsEvents.ProcessStepChange),
            valueInstructions: [
                'set:config.process,var,processSection.steps',
                'set:config.sectionTitleKey,varOr,processSection.titleKey,landing.processSection.title',
                'set:config.sectionSidebarTitleKey,varOr,processSection.sidebarTitleKey,landing.processSection.sidebarTitle',
                'set:config.sectionDetailedDescriptionLabelKey,varOr,processSection.detailedDescriptionLabelKey,landing.processSection.detailedDescriptionLabel',
                'set:config.sectionDeliverablesLabelKey,varOr,processSection.deliverablesLabelKey,landing.processSection.deliverablesLabel',
            ].join('; '),
            config: {
                process: () => [],
                currentStep,
                sectionTitleKey: 'landing.processSection.title',
                sectionSidebarTitleKey: 'landing.processSection.sidebarTitle',
                sectionDetailedDescriptionLabelKey: 'landing.processSection.detailedDescriptionLabel',
                sectionDeliverablesLabelKey: 'landing.processSection.deliverablesLabel',
            },
        },
    ];
