import {
    type TGenericComponent,
    type TLoopBinding,
    type TLoopBindingSource,
    type TLoopBindingTransform,
    type TLoopConfig,
} from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { resolveLocaleMapValue } from '@/app/shared/i18n/locale.utils';
import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';
import { toNavigationHref } from './navigation/navigation-target.utility';

const LOOP_INDEX_TOKEN = '{{index}}';
const LOOP_WHOLE_ITEM_TOKEN = '$item';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

export type { TDynamicValue } from '@/app/shared/types/component-runtime.types';

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

export type TLoopMaterializationOptions = {
    readonly sourceComponents: readonly TGenericComponent[];
    readonly warnOnMissingSource: boolean;
    readonly host?: unknown;
    readonly getVariable: (path: string) => unknown;
    readonly getI18n: (path: string) => unknown;
    readonly getCurrentLanguage: () => string;
    readonly resolveI18nKey: (key: unknown) => string | undefined;
    readonly onMissingTemplate?: (templateId: string) => void;
    readonly onMissingSource?: (source: 'var' | 'i18n' | 'host', path: string) => void;
    readonly finalizeComponent?: (component: TGenericComponent, template: TGenericComponent, generatedId: string) => TGenericComponent | void;
};

export function resolveHostPath(host: unknown, path: string): unknown {
    const normalizedPath = String(path ?? '').trim();
    if (!normalizedPath) return undefined;

    return normalizedPath
        .split('.')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce<unknown>((current, segment) => {
            if (current == null) return undefined;
            if (Array.isArray(current)) {
                const index = Number(segment);
                return Number.isInteger(index) ? current[index] : undefined;
            }
            if (!isRecord(current) || !(segment in current)) return undefined;
            return current[segment];
        }, host);
}

export function applyDefaultLoopComponentFinalizers(component: TGenericComponent, generatedId: string): TGenericComponent {
    const nextComponent = component as any;

    if (component.type === 'container' && Array.isArray(nextComponent.config?.components)) {
        nextComponent.config.components = nextComponent.config.components.map((componentId: unknown) => {
            return replaceLoopIndexToken(componentId, generatedId);
        });
    }

    if (component.type === 'link' && !nextComponent.config?.ariaLabel && typeof nextComponent.config?.text === 'string') {
        nextComponent.config.ariaLabel = nextComponent.config.text;
    }

    return component;
}

export function materializeLoopComponents(options: TLoopMaterializationOptions): Map<string, TGenericComponent> {
    const resolved = new Map<string, TGenericComponent>(options.sourceComponents.map((component) => [component.id, component]));

    for (const component of options.sourceComponents) {
        const loop = (component as { readonly loopConfig?: TLoopConfig }).loopConfig;
        if (!loop) continue;

        const templateId = String(loop.templateId ?? '').trim();
        if (!templateId) continue;

        const template = resolved.get(templateId) ?? options.sourceComponents.find((item) => item.id === templateId);
        if (!template) {
            options.onMissingTemplate?.(templateId);
            continue;
        }

        const items = resolveLoopItems(loop, options);
        const prefix = String(loop.idPrefix ?? templateId).trim() || templateId;
        const generatedIds = items.map((_, index) => `${ prefix }__${ index + 1 }`);

        if (component.type === 'container') {
            resolved.set(component.id, {
                ...component,
                config: {
                    ...component.config,
                    components: generatedIds,
                },
            } as TGenericComponent);
        }

        items.forEach((item, index) => {
            const generatedId = generatedIds[index];
            resolved.set(generatedId, materializeLoopComponent(template, generatedId, item, loop, options));
        });
    }

    return resolved;
}

function resolveLoopItems(loop: TLoopConfig, options: TLoopMaterializationOptions): readonly unknown[] {
    if (loop.source === 'repeat') {
        const count = Number(loop.count ?? 0);
        if (!Number.isFinite(count) || count <= 0) return [];
        return Array.from({ length: Math.floor(count) }, (_, index) => ({ index: index + 1 }));
    }

    const path = String(loop.path ?? '').trim();
    if (!path) return [];

    let raw: unknown;
    if (loop.source === 'var') {
        raw = options.getVariable(path);
    } else if (loop.source === 'i18n') {
        raw = options.getI18n(path);
    } else {
        raw = resolveHostPath(options.host, path);
    }

    if (!Array.isArray(raw)) {
        if (options.warnOnMissingSource) {
            options.onMissingSource?.(loop.source, path);
        }
        return [];
    }

    return raw;
}

function materializeLoopComponent(
    template: TGenericComponent,
    generatedId: string,
    item: unknown,
    loop: TLoopConfig,
    options: TLoopMaterializationOptions,
): TGenericComponent {
    const nextComponent: any = {
        ...template,
        id: generatedId,
        config: {
            ...(template as any).config,
        },
    };

    if (typeof nextComponent.config?.id === 'string') {
        nextComponent.config.id = generatedId;
    }

    applyLoopBindings(nextComponent, loop.bindings, item, options);
    const defaultFinalized = applyDefaultLoopComponentFinalizers(nextComponent as TGenericComponent, generatedId);
    return options.finalizeComponent?.(defaultFinalized, template, generatedId) ?? defaultFinalized;
}

function getLoopBindingSourcePath(source: TLoopBindingSource): string {
    return typeof source === 'string' ? source : source.from;
}

function getLoopBindingSourceTransform(source: TLoopBindingSource): TLoopBindingTransform | undefined {
    return typeof source === 'string' ? undefined : source.transform;
}

function getLoopItemValue(item: unknown, path: string): unknown {
    const normalizedPath = path.trim();
    if (!normalizedPath) return undefined;
    if (normalizedPath === LOOP_WHOLE_ITEM_TOKEN) return item;

    let current: unknown = item;
    for (const segment of normalizedPath.split('.').map((entry) => entry.trim()).filter(Boolean)) {
        if (Array.isArray(current)) {
            const index = Number(segment);
            if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined;
            current = current[index];
            continue;
        }

        if (!isRecord(current) || !(segment in current)) return undefined;
        current = current[segment];
    }

    return current;
}

function hasResolvedLoopBindingValue(value: unknown): boolean {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

function applyLoopBindingTransform(
    value: unknown,
    transform: TLoopBindingTransform | undefined,
    options: TLoopMaterializationOptions,
): unknown {
    if (transform === undefined) return value;

    switch (transform) {
        case 'i18nKey':
            return options.resolveI18nKey(value);
        case 'locale':
            if (typeof value === 'string') return value.trim();
            if (isRecord(value)) {
                return resolveLocaleMapValue(value, options.getCurrentLanguage());
            }
            return undefined;
        case 'navigationHref':
            return value == null ? undefined : toNavigationHref(value);
        default:
            return value;
    }
}

function resolveLoopBindingValue(binding: TLoopBinding, item: unknown, options: TLoopMaterializationOptions): unknown {
    for (const source of binding.sources) {
        const rawValue = getLoopItemValue(item, getLoopBindingSourcePath(source));
        const transformedValue = applyLoopBindingTransform(rawValue, getLoopBindingSourceTransform(source), options);
        if (hasResolvedLoopBindingValue(transformedValue)) {
            return transformedValue;
        }
    }

    if (Object.prototype.hasOwnProperty.call(binding, 'fallback')) {
        return binding.fallback;
    }

    return undefined;
}

function assignLoopBindingValue(target: Record<string, unknown>, path: string, value: unknown): void {
    const segments = path.split('.').map((entry) => entry.trim()).filter(Boolean);
    if (segments.length === 0) return;

    let current = target;
    for (const segment of segments.slice(0, -1)) {
        const existing = current[segment];
        const next = Array.isArray(existing)
            ? [...existing]
            : isRecord(existing)
                ? { ...existing }
                : {};

        current[segment] = next;
        current = next as Record<string, unknown>;
    }

    current[segments.at(-1)!] = value;
}

function applyLoopBindings(
    nextComponent: Record<string, unknown>,
    bindings: readonly TLoopBinding[] | undefined,
    item: unknown,
    options: TLoopMaterializationOptions,
): void {
    if (!Array.isArray(bindings) || bindings.length === 0) return;

    for (const binding of bindings) {
        const resolvedValue = resolveLoopBindingValue(binding, item, options);
        if (resolvedValue === undefined && !Object.prototype.hasOwnProperty.call(binding, 'fallback')) {
            continue;
        }

        assignLoopBindingValue(nextComponent, binding.to, resolvedValue);
    }
}

function replaceLoopIndexToken(value: unknown, generatedId: string): unknown {
    if (typeof value !== 'string' || !value.includes(LOOP_INDEX_TOKEN)) return value;

    const index = String(generatedId.split('__').pop() ?? '').trim();
    if (!index) return value;

    return value.split(LOOP_INDEX_TOKEN).join(index);
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
