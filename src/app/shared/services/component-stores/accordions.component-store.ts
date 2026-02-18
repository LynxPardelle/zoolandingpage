import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";
import { I18nService } from "../i18n.service";

export const createAccordions = (globalI18n: I18nService): TGenericComponent[] => {
    return [
        {
            id: 'faqAccordion',
            type: 'accordion',
            eventInstructions: 'trackFaqToggle:event.eventData',
            config: {
                items: () =>
                    globalI18n.getOr<readonly { id: string; title: string; content: string }[]>('faq', []).map((faqItem) => ({
                        id: faqItem.id,
                        title: faqItem.title,
                        content: faqItem.content,
                    })),
                mode: 'single',
                allowToggle: true,
                containerClasses: 'ank-display-flex ank-flexDirection-column ank-gap-0_25rem',
                defaultItemContainerClasses: 'ank-border-1px-solid ank-borderColor-bgColor ank-borderRadius-0_5rem ank-transition-all ank-bgColor-transparent ng-star-inserted',
                defaultItemButtonConfig: {
                    classes: 'ank-outline-2px__solid__secondaryAccentColor ank-m-8px ank-color-textColor ank-borderRadius-0_25rem ank-border-0 ank-width-calcSD100per__MIN__1remED ank-textAlign-left ank-padding-0_75rem ank-fontWeight-600 ank-transition-all ank-bgHover-secondaryAccentColor ank-colorHover-titleColor ank-cursor-pointer ank-bg-transparent'
                },
                defaultItemContainerIsExpandedClasses: 'accItemExpandedContainer',
                defaultItemContainerIsNotExpandedClasses: 'accItemNotExpandedContainer',
                defaultItemPanelClasses: 'ank-margin-1rem ank-color-textColor',
            },
        },
    ];
};
