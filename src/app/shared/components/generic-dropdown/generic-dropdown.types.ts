export type DropdownItem = {
    readonly id: string;
    readonly label: string;
    readonly disabled?: boolean;
    readonly value?: string;
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
};
