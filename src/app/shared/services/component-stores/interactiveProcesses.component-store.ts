import { ProcessStep } from "@/app/landing-page/components/interactive-process/interactive-process-leaf.types";
import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";
import { AnalyticsEvents } from "../analytics.events";

type InteractiveProcessStoreParams = {
    process: () => readonly ProcessStep[];
    currentStep: () => number;
};

export const createInteractiveProcesses = ({
    process,
    currentStep,
}: InteractiveProcessStoreParams): TGenericComponent[] => [
        {
            id: 'interactiveProcessSection',
            type: 'container',
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
            config: {
                process,
                currentStep,
            },
        },
    ];
