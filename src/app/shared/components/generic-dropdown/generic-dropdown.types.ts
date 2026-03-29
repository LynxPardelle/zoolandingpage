export type DropdownLocalizedText = {
    readonly [locale: string]: string;
};

export type DropdownTextValue = string | DropdownLocalizedText;

export type DropdownItem = {
    readonly id: string;
    readonly label: DropdownTextValue | (() => DropdownTextValue);
    readonly disabled?: boolean | (() => boolean);
    readonly value?: string | (() => string);
    readonly href?: string | (() => string);
    readonly ariaLabel?: DropdownTextValue | (() => DropdownTextValue);
};

export type DropdownMenuRole = 'menu' | 'listbox';
export type DropdownItemRole = 'menuitem' | 'option';

export type MenuTemplateContext = {
    readonly items: readonly DropdownItem[];
    readonly select: (item: DropdownItem) => void;
};

export type DropdownConfig = {
    readonly closeOnSelect?: boolean;
    readonly ariaLabel?: string;
    readonly classes?: string;
    readonly buttonClasses?: string;
    readonly triggerRole?: string;
    /** Classes applied to the <a role="menuitem"> element. */
    readonly itemLinkClasses?: string;
    readonly selectedItemClasses?: string;
    readonly disabledItemClasses?: string;

    /** Classes applied to the dropdown menu container (wraps nav+ul). */
    readonly menuContainerClasses?: string;
    /** Classes applied to the <nav> element inside the menu. */
    readonly menuNavClasses?: string;
    /** Classes applied to the <ul> list element inside the menu. */
    readonly menuListClasses?: string;
    readonly menuId?: string;
    readonly menuRole?: DropdownMenuRole;
    readonly itemRole?: DropdownItemRole;
    readonly selectedItemId?: string | (() => string);

    /** Rendering mode: overlay (CDK overlay) or inline (in-place DOM). */
    readonly renderMode?: 'overlay' | 'inline';
    /** Optional id for the inline menu container div (matches legacy header DOM). */
    readonly menuContainerId?: string;
    /** Where to insert the inline menu in the DOM (CSS selector, relative to dropdown host). */
    readonly inlinePortalTargetSelector?: string;
    /** Overlay anchoring/sizing (useful for mobile full-width menus) */
    readonly overlayOrigin?: 'host' | 'closestHeader' | 'closestContainer';
    readonly overlayMatchWidth?: 'none' | 'origin' | 'viewport';
    readonly overlayOffsetY?: number;
};
