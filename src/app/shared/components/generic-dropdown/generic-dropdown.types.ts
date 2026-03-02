export type DropdownItem = {
    readonly id: string;
    readonly label: string | (() => string);
    readonly disabled?: boolean;
    readonly value?: string | (() => string);
};

export type MenuTemplateContext = {
    readonly items: readonly DropdownItem[];
    readonly select: (item: DropdownItem) => void;
};

export type DropdownConfig = {
    readonly closeOnSelect?: boolean;
    readonly ariaLabel?: string;
    readonly classes?: string;
    readonly buttonClasses?: string;
    /** Classes applied to the <a role="menuitem"> element. */
    readonly itemLinkClasses?: string;

    /** Classes applied to the dropdown menu container (wraps nav+ul). */
    readonly menuContainerClasses?: string;
    /** Classes applied to the <nav> element inside the menu. */
    readonly menuNavClasses?: string;
    /** Classes applied to the <ul> list element inside the menu. */
    readonly menuListClasses?: string;

    /** Rendering mode: overlay (CDK overlay) or inline (in-place DOM). */
    readonly renderMode?: 'overlay' | 'inline';
    /** Optional id for the inline menu container div (matches legacy header DOM). */
    readonly menuContainerId?: string;
    /** Where to insert the inline menu in the DOM (CSS selector, relative to dropdown host). Defaults to 'header'. */
    readonly inlinePortalTargetSelector?: string;
    /** Overlay anchoring/sizing (useful for mobile full-width menus) */
    readonly overlayOrigin?: 'host' | 'closestHeader' | 'closestContainer';
    readonly overlayMatchWidth?: 'none' | 'origin' | 'viewport';
    readonly overlayOffsetY?: number;
};
