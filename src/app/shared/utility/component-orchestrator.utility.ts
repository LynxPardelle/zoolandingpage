import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';

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

    const addClasses = (raw: unknown) => {
        if (!raw || typeof raw !== 'string') return;
        raw
            .split(' ')
            .map((cls) => cls.trim())
            .filter((cls) => cls.length > 0)
            .forEach((cls) => classesSet.add(cls));
    };

    components.forEach((component) => {
        if (component.config && 'classes' in component.config && (component.config as any).classes) {
            addClasses((component.config as any).classes);
        }

        // Also collect classes from dropdownConfig fields (these are not under config.classes)
        if ((component as any).type === 'dropdown') {
            const ddCfg = (component as any).config?.dropdownConfig;
            if (ddCfg) {
                addClasses(ddCfg.classes);
                addClasses(ddCfg.buttonClasses);
                addClasses(ddCfg.itemLinkClasses);
                addClasses(ddCfg.menuContainerClasses);
                addClasses(ddCfg.menuNavClasses);
                addClasses(ddCfg.menuListClasses);
            }
        }
    });

    return Array.from(classesSet);
}
