import {
    type TGenericComponent,
    type TLoopBinding,
    type TLoopBindingSource,
    type TLoopBindingTransform,
    type TLoopCollectionView,
    type TLoopConfig,
    type TLoopViewActivation,
    type TLoopViewFilter,
    type TLoopViewSortOption,
    type TLoopViewValueSource,
} from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { resolveLocaleMapValue } from '@/app/shared/i18n/locale.utils';
import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';
import { toNavigationHref } from './navigation/navigation-target.utility';

const LOOP_INDEX_TOKEN = '{{index}}';
const LOOP_WHOLE_ITEM_TOKEN = '$item';
const CLASS_PROPERTY_PATTERN = /(^classes$|classes$|^classname$|classname$)/i;
const ANGORA_CLASS_TOKEN_PATTERN = /\bank-[^\s,"']+/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const isLoopViewValueSource = (value: unknown): value is TLoopViewValueSource =>
    isRecord(value)
    && typeof value['source'] === 'string'
    && (
        value['source'] === 'literal'
        || value['source'] === 'scope'
        || value['source'] === 'var'
        || value['source'] === 'host'
        || value['source'] === 'queryParam'
    );

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

export function resolveStyleRecord(value: unknown): Readonly<Record<string, string | number | null>> | null {
    const resolved = resolveDynamicValue<unknown>(value as never);
    if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) {
        return null;
    }

    return Object.entries(resolved as Record<string, unknown>)
        .reduce<Record<string, string | number | null>>((acc, [key, entryValue]) => {
            if (entryValue == null || typeof entryValue === 'string' || typeof entryValue === 'number') {
                acc[key] = entryValue ?? null;
            }
            return acc;
        }, {});
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

export function normalizeDomIdValue(value: unknown): string | undefined {
    const normalized = resolveTextValue(value);
    if (!normalized) return undefined;

    const lowerCased = normalized.toLowerCase();
    if (lowerCased === 'undefined' || lowerCased === 'null') {
        return undefined;
    }

    return normalized;
}

export function composeDomId(...parts: readonly unknown[]): string | undefined {
    const normalizedParts = parts
        .map((part) => normalizeDomIdValue(part))
        .filter((part): part is string => typeof part === 'string' && part.length > 0);

    return normalizedParts.length > 0 ? normalizedParts.join('-') : undefined;
}

export function resolveComponentDomIdBase(configId: unknown, componentId: unknown): string | undefined {
    return normalizeDomIdValue(configId) ?? normalizeDomIdValue(componentId);
}

export function resolveComponentRootDomId(
    configId: unknown,
    componentId: unknown,
    componentType: string,
): string | undefined {
    const explicitId = normalizeDomIdValue(configId);
    if (explicitId) {
        return explicitId;
    }

    const baseId = resolveComponentDomIdBase(undefined, componentId);
    return baseId ? composeDomId(baseId, componentType) : undefined;
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
    readonly getQueryParam?: (key: string) => unknown;
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
    const loopItemsCache = new Map<string, readonly unknown[]>();

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

        const items = resolveLoopItems(loop, options, loopItemsCache);
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

function resolveLoopItems(
    loop: TLoopConfig,
    options: TLoopMaterializationOptions,
    cache: Map<string, readonly unknown[]>,
): readonly unknown[] {
    const cacheKey = resolveLoopItemsCacheKey(loop);
    if (cacheKey && cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
    }

    const resolvedItems = resolveLoopItemsUncached(loop, options);
    if (cacheKey) {
        cache.set(cacheKey, resolvedItems);
    }

    return resolvedItems;
}

function resolveLoopItemsCacheKey(loop: TLoopConfig): string | undefined {
    try {
        if (loop.source === 'repeat') {
            return JSON.stringify({
                source: loop.source,
                count: loop.count,
                view: loop.view,
            });
        }

        return JSON.stringify({
            source: loop.source,
            path: loop.path,
            view: loop.view,
        });
    } catch {
        return undefined;
    }
}

function resolveLoopItemsUncached(loop: TLoopConfig, options: TLoopMaterializationOptions): readonly unknown[] {
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

    return applyLoopCollectionView(raw, loop.view, options);
}

export function resolveLoopCollectionViewItems(
    items: readonly unknown[],
    view: TLoopCollectionView | undefined,
    options: TLoopMaterializationOptions,
    settings: { readonly applyPagination?: boolean } = {},
): readonly unknown[] {
    if (!view) return items;

    let nextItems = [...items];
    nextItems = applyLoopViewFilters(nextItems, view.filters, options);
    nextItems = applyLoopViewSort(nextItems, view.sort, options);
    if (settings.applyPagination !== false) {
        nextItems = applyLoopViewPagination(nextItems, view.pagination, options);
    }
    return nextItems;
}

function applyLoopCollectionView(
    items: readonly unknown[],
    view: TLoopCollectionView | undefined,
    options: TLoopMaterializationOptions,
): readonly unknown[] {
    return resolveLoopCollectionViewItems(items, view, options);
}

function applyLoopViewFilters(
    items: readonly unknown[],
    filters: readonly TLoopViewFilter[] | undefined,
    options: TLoopMaterializationOptions,
): unknown[] {
    if (!Array.isArray(filters) || filters.length === 0) return [...items];

    return items.filter((item) => filters.every((filter) => matchesLoopViewFilter(item, filter, options)));
}

function matchesLoopViewFilter(
    item: unknown,
    filter: TLoopViewFilter,
    options: TLoopMaterializationOptions,
): boolean {
    if (!isLoopViewFilterActive(filter, options)) return true;

    const op = filter.op ?? 'equals';
    if (op === 'exists') return resolveLoopItemPathValues(item, filter.path).some(hasResolvedLoopBindingValue);
    if (op === 'notExists') return !resolveLoopItemPathValues(item, filter.path).some(hasResolvedLoopBindingValue);

    const filterValue = resolveLoopViewValue(filter.value, options);
    if (shouldIgnoreLoopFilterValue(filterValue, filter.ignoreValues)) return true;

    const values = resolveLoopItemPathValues(item, filter.path);
    switch (op) {
        case 'notEquals':
            return !values.some((entry) => valuesEqual(entry, filterValue));
        case 'contains':
            return values.some((entry) => normalizeComparable(entry).includes(normalizeComparable(filterValue)));
        case 'includes':
        case 'equals':
        default:
            return values.some((entry) => valuesEqual(entry, filterValue));
    }
}

function isLoopViewFilterActive(filter: TLoopViewFilter, options: TLoopMaterializationOptions): boolean {
    const activeWhen = filter.activeWhen;
    if (!activeWhen) return true;

    return matchesLoopViewActivation(activeWhen, options);
}

function matchesLoopViewActivation(activeWhen: TLoopViewActivation, options: TLoopMaterializationOptions): boolean {
    const value = resolveLoopViewValue(activeWhen.source, options);
    if (Object.prototype.hasOwnProperty.call(activeWhen, 'equals') && !valuesEqual(value, activeWhen.equals)) {
        return false;
    }
    if (Object.prototype.hasOwnProperty.call(activeWhen, 'notEquals') && valuesEqual(value, activeWhen.notEquals)) {
        return false;
    }
    return true;
}

function shouldIgnoreLoopFilterValue(value: unknown, ignoreValues: readonly unknown[] | undefined): boolean {
    if (value == null) return true;
    if (typeof value === 'string' && value.trim().length === 0) return true;
    return Array.isArray(ignoreValues) && ignoreValues.some((entry) => valuesEqual(entry, value));
}

function applyLoopViewSort(
    items: readonly unknown[],
    sort: TLoopCollectionView['sort'],
    options: TLoopMaterializationOptions,
): unknown[] {
    const sortOption = resolveLoopViewSortOption(sort, options);
    if (!sortOption?.path) return [...items];

    const direction = sortOption.direction === 'desc' ? -1 : 1;
    const type = sortOption.type ?? 'text';

    return [...items].sort((a, b) => direction * compareLoopSortValues(
        resolveLoopItemPathValues(a, sortOption.path)[0],
        resolveLoopItemPathValues(b, sortOption.path)[0],
        type,
    ));
}

function resolveLoopViewSortOption(
    sort: TLoopCollectionView['sort'],
    options: TLoopMaterializationOptions,
): TLoopViewSortOption | undefined {
    if (!sort) return undefined;

    if (sort.by && sort.options) {
        const key = String(resolveLoopViewValue(sort.by, options) ?? '').trim();
        if (key && sort.options[key]) {
            return sort.options[key];
        }
    }

    return sort.path ? sort : undefined;
}

function compareLoopSortValues(a: unknown, b: unknown, type: 'text' | 'number'): number {
    if (type === 'number') {
        const left = Number(a);
        const right = Number(b);
        const safeLeft = Number.isFinite(left) ? left : Number.NEGATIVE_INFINITY;
        const safeRight = Number.isFinite(right) ? right : Number.NEGATIVE_INFINITY;
        return safeLeft - safeRight;
    }

    return normalizeComparable(a).localeCompare(normalizeComparable(b), undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

function applyLoopViewPagination(
    items: readonly unknown[],
    pagination: TLoopCollectionView['pagination'],
    options: TLoopMaterializationOptions,
): unknown[] {
    if (!pagination) return [...items];
    if (!shouldApplyLoopViewPagination(pagination, options)) return [...items];

    const pageSize = normalizePositiveInteger(resolveLoopViewMaybeSource(pagination.pageSize, options));
    if (!pageSize) return [...items];

    const pageIndexBase = pagination.pageIndexBase === 0 ? 0 : 1;
    const rawPage = normalizePositiveInteger(resolveLoopViewMaybeSource(pagination.page, options)) ?? pageIndexBase;
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const maxPage = pageIndexBase + pageCount - 1;
    const page = Math.min(maxPage, Math.max(pageIndexBase, rawPage));
    const start = (page - pageIndexBase) * pageSize;
    return [...items].slice(start, start + pageSize);
}

function shouldApplyLoopViewPagination(
    pagination: TLoopCollectionView['pagination'],
    options: TLoopMaterializationOptions,
): boolean {
    const keys = pagination?.applyWhenAnyQueryParam;
    if (!Array.isArray(keys) || keys.length === 0) {
        return true;
    }

    return keys
        .map((entry) => String(entry ?? '').trim())
        .filter(Boolean)
        .some((key) => hasActiveLoopQueryParam(key, options));
}

function hasActiveLoopQueryParam(key: string, options: TLoopMaterializationOptions): boolean {
    const value = options.getQueryParam?.(key) ?? readBrowserQueryParam(key);
    if (value == null) return false;

    const normalized = String(value).trim().toLowerCase();
    return !!normalized
        && normalized !== 'all'
        && normalized !== 'undefined'
        && normalized !== 'null';
}

function normalizePositiveInteger(value: unknown): number | undefined {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.floor(parsed);
}

function resolveLoopViewMaybeSource(
    value: unknown,
    options: TLoopMaterializationOptions,
): unknown {
    return isLoopViewValueSource(value) ? resolveLoopViewValue(value, options) : value;
}

function resolveLoopViewValue(value: unknown, options: TLoopMaterializationOptions): unknown {
    if (!isLoopViewValueSource(value)) return value;

    if (value.source === 'literal') {
        return Object.prototype.hasOwnProperty.call(value, 'value') ? value.value : value.fallback;
    }

    if (value.source === 'queryParam') {
        const key = String(value.key ?? '').trim();
        const resolved = key ? options.getQueryParam?.(key) ?? readBrowserQueryParam(key) : undefined;
        return resolved == null || resolved === '' ? value.fallback : resolved;
    }

    const path = String(value.path ?? '').trim();
    if (!path) return value.fallback;

    let resolved: unknown;
    if (value.source === 'scope') {
        const scope = resolveHostPath(options.host, 'interactionScope');
        resolved = isRecord(scope) && typeof scope['resolvePath'] === 'function'
            ? (scope['resolvePath'] as (path: string) => unknown)(path)
            : undefined;
    } else if (value.source === 'var') {
        resolved = options.getVariable(path);
    } else {
        resolved = resolveHostPath(options.host, path);
    }

    return resolved == null || resolved === '' ? value.fallback : resolved;
}

function readBrowserQueryParam(key: string): string | undefined {
    if (typeof window === 'undefined' || !window.location?.search) {
        return undefined;
    }

    return new URLSearchParams(window.location.search).get(key) ?? undefined;
}

function resolveLoopItemPathValues(item: unknown, path: string): readonly unknown[] {
    const normalizedPath = path.trim();
    if (!normalizedPath) return [];
    if (normalizedPath === LOOP_WHOLE_ITEM_TOKEN) return [item];

    return normalizedPath
        .split('.')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce<readonly unknown[]>((currentValues, segment) => {
            const nextValues: unknown[] = [];
            currentValues.forEach((current) => {
                if (Array.isArray(current)) {
                    if (/^\d+$/.test(segment)) {
                        const index = Number(segment);
                        if (index >= 0 && index < current.length) nextValues.push(current[index]);
                        return;
                    }
                    current.forEach((entry) => {
                        if (isRecord(entry) && segment in entry) nextValues.push(entry[segment]);
                    });
                    return;
                }

                if (isRecord(current) && segment in current) {
                    nextValues.push(current[segment]);
                }
            });
            return nextValues.flatMap((value) => Array.isArray(value) ? value : [value]);
        }, [item]);
}

function normalizeComparable(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

function valuesEqual(a: unknown, b: unknown): boolean {
    if (typeof a === 'number' || typeof b === 'number') {
        const left = Number(a);
        const right = Number(b);
        if (Number.isFinite(left) && Number.isFinite(right)) {
            return left === right;
        }
    }

    if (typeof a === 'boolean' || typeof b === 'boolean') {
        return normalizeComparable(a) === normalizeComparable(b);
    }

    return normalizeComparable(a) === normalizeComparable(b);
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
        case 'uriComponent':
            return value == null ? undefined : encodeURIComponent(String(value).trim());
        default:
            return value;
    }
}

function applyLoopBindingAffixes(value: unknown, binding: TLoopBinding): unknown {
    const prefix = String(binding.prefix ?? '');
    const suffix = String(binding.suffix ?? '');
    if (!prefix && !suffix) return value;

    return `${ prefix }${ String(value) }${ suffix }`;
}

function resolveLoopBindingValue(binding: TLoopBinding, item: unknown, options: TLoopMaterializationOptions): unknown {
    for (const source of binding.sources) {
        const rawValue = getLoopItemValue(item, getLoopBindingSourcePath(source));
        const transformedValue = applyLoopBindingTransform(rawValue, getLoopBindingSourceTransform(source), options);
        if (hasResolvedLoopBindingValue(transformedValue)) {
            return applyLoopBindingAffixes(transformedValue, binding);
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

export function collectAllClassesFromComponents(
    components: readonly TGenericComponent[],
    normalizeClasses?: (value: string) => string,
): string[] {
    const classesSet: Set<string> = new Set<string>();

    const addClasses = (raw: unknown, normalize?: (value: string) => string) => {
        const resolved = resolveDynamicValue(raw as TDynamicValue<unknown> | null | undefined);
        if (!resolved || typeof resolved !== 'string') return;
        (normalize ? normalize(resolved) : resolved)
            .split(' ')
            .map((cls) => cls.trim())
            .filter((cls) => cls.length > 0)
            .forEach((cls) => classesSet.add(cls));
    };

    const addValueInstructionClasses = (raw: unknown): void => {
        if (typeof raw !== 'string' || !raw.includes('ank-')) return;
        const matches = raw.match(ANGORA_CLASS_TOKEN_PATTERN);
        if (!matches?.length) return;
        addClasses(matches.join(' '), normalizeClasses);
    };

    const collectClassBearingValues = (value: unknown, key = ''): void => {
        const isClassProperty = CLASS_PROPERTY_PATTERN.test(key);

        if (isClassProperty) {
            addClasses(value, normalizeClasses);
        }

        if (key === 'valueInstructions') {
            addValueInstructionClasses(value);
        }

        const resolved = resolveDynamicValue(value as TDynamicValue<unknown> | null | undefined);
        if (!resolved || typeof resolved !== 'object') {
            return;
        }

        if (Array.isArray(resolved)) {
            resolved.forEach((entry) => collectClassBearingValues(entry, key));
            return;
        }

        Object.entries(resolved as Record<string, unknown>).forEach(([entryKey, entry]) => {
            collectClassBearingValues(entry, entryKey);
        });
    };

    components.forEach((component) => {
        collectClassBearingValues(component);
    });

    return Array.from(classesSet);
}
