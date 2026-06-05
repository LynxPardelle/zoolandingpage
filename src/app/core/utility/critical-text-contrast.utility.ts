const CRITICAL_TEXT_SELECTOR = '.sectionTitle, .sectionSubtitle, .heroCaption';
const MIN_CRITICAL_TEXT_CONTRAST = 3;
const RGB_COLOR_PATTERN = /^rgba?\(([^)]+)\)$/i;

type TParsedColor = {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;
};

export function hasReadableCriticalTextContrast(root: ParentNode, documentRef: Document = document): boolean {
    const elements = Array.from(root.querySelectorAll<HTMLElement>(CRITICAL_TEXT_SELECTOR))
        .filter((element) => isRelevantTextElement(element, documentRef));

    if (elements.length === 0) {
        return true;
    }

    return elements.every((element) => {
        const color = parseCssColor(documentRef.defaultView?.getComputedStyle(element).color ?? '');
        const background = resolveEffectiveBackgroundColor(element, documentRef);

        if (!color || !background) {
            return true;
        }

        return contrastRatio(color, background) >= MIN_CRITICAL_TEXT_CONTRAST;
    });
}

function isRelevantTextElement(element: HTMLElement, documentRef: Document): boolean {
    if (!String(element.textContent ?? '').trim()) {
        return false;
    }

    const view = documentRef.defaultView;
    if (!view) {
        return true;
    }

    const style = view.getComputedStyle(element);
    return style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.visibility !== 'collapse'
        && Number(style.opacity || 1) > 0;
}

function resolveEffectiveBackgroundColor(element: HTMLElement, documentRef: Document): TParsedColor | null {
    const view = documentRef.defaultView;
    if (!view) {
        return null;
    }

    let current: Element | null = element;
    while (current) {
        const color = parseCssColor(view.getComputedStyle(current).backgroundColor);
        if (color && color.a > 0.05) {
            return color;
        }

        current = current.parentElement;
    }

    const bodyColor = documentRef.body
        ? parseCssColor(view.getComputedStyle(documentRef.body).backgroundColor)
        : null;
    if (bodyColor && bodyColor.a > 0.05) {
        return bodyColor;
    }

    const rootColor = documentRef.documentElement
        ? parseCssColor(view.getComputedStyle(documentRef.documentElement).backgroundColor)
        : null;
    if (rootColor && rootColor.a > 0.05) {
        return rootColor;
    }

    return { r: 255, g: 255, b: 255, a: 1 };
}

function parseCssColor(value: string): TParsedColor | null {
    const match = String(value ?? '').trim().match(RGB_COLOR_PATTERN);
    if (!match) {
        return null;
    }

    const parts = match[1]
        .split(',')
        .map((part) => part.trim());

    if (parts.length < 3) {
        return null;
    }

    const [r, g, b] = parts.slice(0, 3).map(Number);
    const a = parts[3] === undefined ? 1 : Number(parts[3]);

    if (![r, g, b, a].every(Number.isFinite)) {
        return null;
    }

    return {
        r: clampColorChannel(r),
        g: clampColorChannel(g),
        b: clampColorChannel(b),
        a: Math.max(0, Math.min(1, a)),
    };
}

function contrastRatio(foreground: TParsedColor, background: TParsedColor): number {
    const blendedForeground = blendOverBackground(foreground, background);
    const light = relativeLuminance(blendedForeground);
    const dark = relativeLuminance(background);
    const lighter = Math.max(light, dark);
    const darker = Math.min(light, dark);
    return (lighter + 0.05) / (darker + 0.05);
}

function blendOverBackground(foreground: TParsedColor, background: TParsedColor): TParsedColor {
    if (foreground.a >= 1) {
        return foreground;
    }

    return {
        r: foreground.r * foreground.a + background.r * (1 - foreground.a),
        g: foreground.g * foreground.a + background.g * (1 - foreground.a),
        b: foreground.b * foreground.a + background.b * (1 - foreground.a),
        a: 1,
    };
}

function relativeLuminance(color: TParsedColor): number {
    const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clampColorChannel(value: number): number {
    return Math.max(0, Math.min(255, value));
}
