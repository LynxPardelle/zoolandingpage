import type { TDynamicStringValue, TDynamicValue, TLocalizedText } from '@/app/shared/types/component-runtime.types';

export type DropdownLocalizedText = TLocalizedText;

export type DropdownTextValue = string | DropdownLocalizedText;

export type DropdownItem = {
    readonly id: string;
    readonly label: TDynamicValue<DropdownTextValue>;
    readonly disabled?: TDynamicValue<boolean>;
    readonly value?: TDynamicStringValue;
    readonly href?: TDynamicStringValue;
    readonly ariaLabel?: TDynamicValue<DropdownTextValue>;
};

export type DropdownMenuRole = 'menu' | 'listbox';
export type DropdownItemRole = 'menuitem' | 'option';

export type MenuTemplateContext = {
    readonly items: readonly DropdownItem[];
    readonly select: (item: DropdownItem) => void;
};

export type DropdownConfig = {
    readonly closeOnSelect?: boolean;
    readonly ariaLabel?: TDynamicStringValue;
    readonly classes?: TDynamicStringValue;
    readonly buttonClasses?: TDynamicStringValue;
    readonly triggerRole?: TDynamicStringValue;
    /** Classes applied to the <a role="menuitem"> element. */
    readonly itemLinkClasses?: TDynamicStringValue;
    readonly selectedItemClasses?: TDynamicStringValue;
    readonly disabledItemClasses?: TDynamicStringValue;

    /** Classes applied to the dropdown menu container (wraps nav+ul). */
    readonly menuContainerClasses?: TDynamicStringValue;
    /** Classes applied to the <nav> element inside the menu. */
    readonly menuNavClasses?: TDynamicStringValue;
    /** Classes applied to the <ul> list element inside the menu. */
    readonly menuListClasses?: TDynamicStringValue;
    readonly menuId?: TDynamicStringValue;
    readonly menuRole?: DropdownMenuRole;
    readonly itemRole?: DropdownItemRole;
    readonly selectedItemId?: TDynamicStringValue;

    /** Rendering mode: overlay (CDK overlay) or inline (in-place DOM). */
    readonly renderMode?: 'overlay' | 'inline';
    /** Optional id for the inline menu container div (matches legacy header DOM). */
    readonly menuContainerId?: TDynamicStringValue;
    /** Where to insert the inline menu in the DOM (CSS selector, relative to dropdown host). */
    readonly inlinePortalTargetSelector?: TDynamicStringValue;
    /** Overlay anchoring/sizing (useful for mobile full-width menus) */
    readonly overlayOrigin?: 'host' | 'closestHeader' | 'closestContainer';
    readonly overlayMatchWidth?: 'none' | 'origin' | 'viewport';
    readonly overlayOffsetY?: number;
};
