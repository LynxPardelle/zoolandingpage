import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';

export type TDynamicValue<TValue> = TValue | (() => TValue);

export type TTranslatedContentLookup = {
    readonly get: (key: string) => unknown;
    readonly tOr: (key: string, fallback: string) => string;
};

export type TComponentItemsSource = {
    readonly source: 'i18n' | 'var';
    readonly path: string;
};

export function resolveDynamicValue<TValue>(value: TDynamicValue<TValue> | null | undefined): TValue | null {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
        return (value as () => TValue)();
    }

    return (value ?? null) as TValue | null;
}

export function resolveConfigSourceValue(
    source: TComponentItemsSource | null | undefined,
    fallbackValue: unknown,
    dependencies: {
        readonly getVariable: (path: string) => unknown;
        readonly getI18n: (path: string) => unknown;
    },
): unknown {
    const normalizedPath = String(source?.path ?? '').trim();
    if (!normalizedPath) {
        return resolveDynamicValue(fallbackValue as TDynamicValue<unknown> | null | undefined);
    }

    return source?.source === 'var'
        ? dependencies.getVariable(normalizedPath)
        : dependencies.getI18n(normalizedPath);
}

export function resolveTextValue(value: unknown): string | undefined {
    const resolved = resolveDynamicValue(value as TDynamicValue<unknown> | null | undefined);
    if (resolved == null) return undefined;

    const normalized = String(resolved).trim();
    return normalized.length > 0 ? normalized : undefined;
}

export function normalizeStringArray(value: unknown): readonly string[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((entry) => String(entry ?? '').trim())
        .filter(Boolean);
}

export function resolveTranslatedText(
    lookup: TTranslatedContentLookup,
    value: unknown,
    key?: unknown,
): string | undefined {
    const literal = resolveTextValue(value);
    if (literal) return literal;

    const normalizedKey = String(resolveDynamicValue(key as TDynamicValue<unknown> | null | undefined) ?? '').trim();
    if (!normalizedKey) return undefined;

    const direct = lookup.get(normalizedKey);
    if (typeof direct === 'string' && direct.trim().length > 0) {
        return direct.trim();
    }

    const translated = lookup.tOr(normalizedKey, '');
    return translated.trim().length > 0 ? translated.trim() : undefined;
}

export function resolveTranslatedStringList(
    lookup: TTranslatedContentLookup,
    value: unknown,
    key?: unknown,
    keys?: unknown,
): readonly string[] | undefined {
    const literal = normalizeStringArray(resolveDynamicValue(value as TDynamicValue<unknown> | null | undefined));
    if (literal.length > 0) return literal;

    const normalizedKey = String(resolveDynamicValue(key as TDynamicValue<unknown> | null | undefined) ?? '').trim();
    if (normalizedKey) {
        const direct = lookup.get(normalizedKey);
        const fromKey = normalizeStringArray(direct);
        if (fromKey.length > 0) return fromKey;
    }

    if (Array.isArray(keys)) {
        const fromKeys = keys
            .map((entry) => resolveTranslatedText(lookup, undefined, entry))
            .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
        if (fromKeys.length > 0) return fromKeys;
    }

    return undefined;
}

export function normalizeCanonicalContentItemId(record: Record<string, unknown>, index: number): string {
    const explicit = resolveTextValue(record['id']);
    if (explicit) return explicit;

    const stepNumber = Number(record['step']);
    if (Number.isFinite(stepNumber) && stepNumber > 0) {
        return `item-${ Math.floor(stepNumber) }`;
    }

    return `item-${ index + 1 }`;
}

export function scrollElementIntoViewportCenter(
    element: HTMLElement,
    targetWindow: Pick<Window, 'innerHeight' | 'pageYOffset' | 'scrollTo'> = window,
): void {
    const rect = element.getBoundingClientRect();
    const target = rect.top + targetWindow.pageYOffset - targetWindow.innerHeight / 2 + rect.height / 2;

    targetWindow.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
}

export function normalizeComponentType(rawType: unknown): string {
    return String(rawType ?? '')
        .trim()
        .replace(/[\u2010\u2011\u2212]/g, '-');
}

export function normalizeComponentIfNeeded(component: TGenericComponent): TGenericComponent {
    const normalizedType = normalizeComponentType((component as any).type);
    if (!normalizedType) return component;
    if (normalizedType === (component as any).type) return component;
    return { ...(component as any), type: normalizedType } as TGenericComponent;
}

export class ComponentRenderTracker {
    private readonly rendered = new Set<string>();
    private readonly remaining: Set<string>;

    constructor(componentIds: readonly string[]) {
        this.remaining = new Set(componentIds);
    }

    markRendered(id: string): void {
        const normalizedId = String(id ?? '').trim();
        if (!normalizedId) return;
        this.rendered.add(normalizedId);
        this.remaining.delete(normalizedId);
    }

    allRendered(): boolean {
        return this.remaining.size === 0;
    }
}

export function findComponentById(
    components: readonly TGenericComponent[],
    id: string,
): TGenericComponent | undefined {
    const normalizedId = String(id ?? '').trim();
    if (!normalizedId) return undefined;
    return components.find((c) => c.id === normalizedId);
}

export function collectAllClassesFromComponents(components: readonly TGenericComponent[]): string[] {
    const classesSet: Set<string> = new Set<string>();
    const dropdownClassKeys = [
        'classes',
        'buttonClasses',
        'itemLinkClasses',
        'selectedItemClasses',
        'disabledItemClasses',
        'menuContainerClasses',
        'menuNavClasses',
        'menuListClasses',
    ] as const;
    const inputClassKeys = [
        'classes',
        'labelClasses',
        'descriptionClasses',
        'helperTextClasses',
        'fieldClasses',
        'inputClasses',
        'dropdownTriggerClasses',
        'dropdownIndicatorClasses',
        'optionContainerClasses',
        'optionClasses',
        'activeOptionClasses',
        'errorClasses',
    ] as const;
    const nestedTextConfigKeys = [
        'labelTextConfig',
        'descriptionTextConfig',
        'helperTextConfig',
        'errorTextConfig',
        'dropdownTriggerTextConfig',
    ] as const;

    const addClasses = (raw: unknown) => {
        if (!raw || typeof raw !== 'string') return;
        raw
            .split(' ')
            .map((cls) => cls.trim())
            .filter((cls) => cls.length > 0)
            .forEach((cls) => classesSet.add(cls));
    };

    const addClassProperties = (record: Record<string, unknown>, keys: readonly string[]) => {
        keys.forEach((key) => addClasses(record[key]));
    };

    components.forEach((component) => {
        if (component.config && 'classes' in component.config && (component.config as any).classes) {
            addClasses((component.config as any).classes);
        }

        // Also collect classes from dropdownConfig fields (these are not under config.classes)
        if ((component as any).type === 'dropdown') {
            const ddCfg = (component as any).config?.dropdownConfig;
            if (ddCfg && typeof ddCfg === 'object' && !Array.isArray(ddCfg)) {
                addClassProperties(ddCfg as Record<string, unknown>, dropdownClassKeys);
            }
        }

        if ((component as any).type === 'input') {
            const inputConfig = (component as any).config;
            if (!inputConfig || typeof inputConfig !== 'object' || Array.isArray(inputConfig)) {
                return;
            }

            addClassProperties(inputConfig as Record<string, unknown>, inputClassKeys);

            const dropdownConfig = (inputConfig as Record<string, unknown>)['dropdownConfig'];
            if (dropdownConfig && typeof dropdownConfig === 'object' && !Array.isArray(dropdownConfig)) {
                addClassProperties(dropdownConfig as Record<string, unknown>, dropdownClassKeys);
            }

            nestedTextConfigKeys.forEach((key) => {
                const textConfig = (inputConfig as Record<string, unknown>)[key];
                if (textConfig && typeof textConfig === 'object' && !Array.isArray(textConfig)) {
                    addClasses((textConfig as Record<string, unknown>)['classes']);
                }
            });
        }
    });

    return Array.from(classesSet);
}
