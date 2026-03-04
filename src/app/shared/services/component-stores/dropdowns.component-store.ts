import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

export const dropdowns: TGenericComponent[] = [
    /* Header (Mobile) */
    {
        id: 'headerMobileNav',
        type: 'dropdown',
        condition: 'all:navigation,exists',
        eventInstructions: 'trackNavClick:event.eventData.label,event.eventData.value;navigationToSection:event.eventData.value',
        valueInstructions: 'set:config.items,var,navigation; set:config.dropdownConfig.ariaLabel,i18n,ui.accessibility.mobileMenuAriaLabel',
        config: {
            items: [],
            dropdownConfig: {
                ariaLabel: '',
                classes: '',
                buttonClasses: 'ank-bg-transparent ank-border-0 ank-p-0 ank-cursor-pointer',
                itemLinkClasses: 'ank-display-block ank-padding-8px ank-borderRadius-0_75rem ank-textDecoration-none ank-transition-bgColor ank-duration-50 ank-bg-secondaryBgColor ank-color-accentColor',
                menuContainerClasses: 'ank-display-md-none ank-bg-bgColor ank-borderTop-1px ank-borderColor-secondaryBgColor ank-padding-20px ank-space-y-20px ank-animation-fadeInDown ng-star-inserted',
                menuNavClasses: 'ng-star-inserted',
                menuListClasses: 'ank-listStyle-none ank-padding-0 ank-margin-0 ank-display-flex ank-flexDirection-column ank-gap-8px',
                renderMode: 'inline',
                menuContainerId: 'mobile-primary-navigation',
                closeOnSelect: true,
            },
            components: ['menu'],
        }
    },
];
