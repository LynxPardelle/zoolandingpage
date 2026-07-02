import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { VariableStoreService } from '../../services/variable-store.service';
import {
  findInteractionScope,
  type TInteractionScopeHost,
} from '../interaction-scope/interaction-scope.service';
import { WrapperOrchestrator } from '../wrapper-orchestrator/wrapper-orchestrator.component';
import type {
  TGenericComponent,
  TGenericComponentType,
} from '../wrapper-orchestrator/wrapper-orchestrator.types';
import type {
  TGenericComponentPreviewConfig,
  TGenericComponentPreviewSource,
} from './generic-component-preview.types';

const DEFAULT_ALLOWED_TYPES = new Set<TGenericComponentType>([
  'accordion',
  'button',
  'container',
  'embed-frame',
  'generic-card',
  'generic-cell',
  'generic-rich-text',
  'generic-table',
  'icon',
  'input',
  'link',
  'loading-spinner',
  'media',
  'pagination',
  'qr-code',
  'search-box',
  'stats-counter',
  'tab-group',
  'text',
  'tooltip',
]);

const FORBIDDEN_STRING =
  /(?:javascript:|data:|X-Amz-Signature|X-Amz-Credential|X-Amz-Security-Token|AWSAccessKeyId=|Signature=|Expires=|ssm:\/|secretsmanager:\/)/iu;

const FORBIDDEN_KEY =
  /(?:credentialRef|clientSecret|accessToken|refreshToken|idToken|password|privateKey|secret|token)$/iu;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const safeId = (value: unknown, fallback: string): string => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

type PreviewNormalizeContext = {
  readonly allowed: ReadonlySet<TGenericComponentType>;
  readonly allowedRawIds: ReadonlySet<string>;
  readonly maxComponents: number;
  readonly output: TGenericComponent[];
  readonly seen: Set<string>;
  readonly fallbackId: string;
};

const clampMaxComponents = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 40;
  return Math.max(1, Math.min(120, Math.floor(parsed)));
};

@Component({
  selector: 'generic-component-preview',
  standalone: true,
  imports: [CommonModule, forwardRef(() => WrapperOrchestrator)],
  templateUrl: './generic-component-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericComponentPreviewComponent {
  readonly config = input<TGenericComponentPreviewConfig | null>(null);
  readonly hostContext = input<unknown>();
  readonly componentId = input<string>('');

  private readonly configurations = inject(ConfigurationsOrchestratorService);
  private readonly variables = inject(VariableStoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly groupId = `component-preview:${ Math.random().toString(36).slice(2) }`;

  readonly normalizedConfig = computed<TGenericComponentPreviewConfig>(
    () => this.config() ?? {}
  );

  readonly label = computed(() => String(this.normalizedConfig().label ?? '').trim());
  readonly description = computed(() =>
    String(this.normalizedConfig().description ?? '').trim()
  );

  readonly classes = computed(() =>
    String(
      this.normalizedConfig().classes ??
        'ank-width-100per ank-display-flex ank-flexDirection-column ank-gap-10px'
    )
  );
  readonly labelClasses = computed(() =>
    String(
      this.normalizedConfig().labelClasses ??
        'ank-m-0 ank-fontSize-18px ank-fontWeight-900 ank-color-titleColor'
    )
  );
  readonly descriptionClasses = computed(() =>
    String(
      this.normalizedConfig().descriptionClasses ??
        'ank-m-0 ank-fontSize-13px ank-lineHeight-1_45 ank-color-secondaryTextColor ank-fontWeight-700'
    )
  );
  readonly stateClasses = computed(() =>
    String(
      this.normalizedConfig().stateClasses ??
        'ank-p-14px ank-borderRadius-8px ank-bg-bgColor ank-color-secondaryTextColor ank-fontWeight-800'
    )
  );
  readonly previewClasses = computed(() =>
    String(
      this.normalizedConfig().previewClasses ??
        'ank-width-100per ank-display-flex ank-flexDirection-column ank-gap-10px'
    )
  );

  private readonly sourceValue = computed(() => this.resolveSourceValue());

  readonly parseResult = computed(() => {
    const config = this.normalizedConfig();
    const allowed = new Set<TGenericComponentType>(
      (config.allowedTypes?.length ? config.allowedTypes : Array.from(DEFAULT_ALLOWED_TYPES))
        .filter((entry): entry is TGenericComponentType =>
          DEFAULT_ALLOWED_TYPES.has(entry)
        )
    );
    return this.normalizePreviewComponents(this.sourceValue(), {
      allowed,
      maxComponents: clampMaxComponents(config.maxComponents),
    });
  });

  readonly rootIds = computed(() => this.parseResult().rootIds);
  readonly invalidMessage = computed(() => {
    const issue = this.parseResult().issue;
    if (!issue) return '';
    return String(
      this.normalizedConfig().invalidText ??
        'No se puede previsualizar este JSON. Corrige la estructura y vuelve a intentarlo.'
    );
  });
  readonly emptyMessage = computed(() =>
    String(
      this.normalizedConfig().emptyText ??
        'Agrega un bloque JSON válido para ver una previsualización.'
    )
  );

  constructor() {
    effect(() => {
      const result = this.parseResult();
      if (result.components.length > 0) {
        this.configurations.setAuxiliaryComponentsFromPayload(this.groupId, {
          version: 1,
          domain: 'preview.local',
          pageId: this.componentId() || 'component-preview',
          components: result.components,
        });
        return;
      }
      this.configurations.setAuxiliaryComponentsFromPayload(this.groupId, null);
    });

    this.destroyRef.onDestroy(() => {
      this.configurations.setAuxiliaryComponentsFromPayload(this.groupId, null);
    });
  }

  private resolveSourceValue(): unknown {
    const source = this.normalizedConfig().source;
    if (!source) return this.normalizedConfig().value;

    const resolved = this.resolveConfiguredSource(source);
    return resolved == null ? source.fallback : resolved;
  }

  private resolveConfiguredSource(source: TGenericComponentPreviewSource): unknown {
    if (source.type === 'literal') return source.value;
    if (source.type === 'var') {
      const path = String(source.path ?? '').trim();
      return path ? this.variables.get(path) : undefined;
    }
    if (source.type === 'scope') {
      const path = String(source.path ?? '').trim();
      const scope = findInteractionScope(this.hostContext() as TInteractionScopeHost);
      return path && scope ? scope.resolvePath(path) : undefined;
    }
    return undefined;
  }

  private normalizePreviewComponents(
    source: unknown,
    options: {
      readonly allowed: ReadonlySet<TGenericComponentType>;
      readonly maxComponents: number;
    }
  ): {
    readonly components: readonly TGenericComponent[];
    readonly rootIds: readonly string[];
    readonly issue?: string;
  } {
    const parsed = this.parseSource(source);
    if (parsed.issue) return { components: [], rootIds: [], issue: parsed.issue };
    if (parsed.value == null || parsed.value === '') {
      return { components: [], rootIds: [] };
    }

    const entries = Array.isArray(parsed.value) ? parsed.value : [parsed.value];
    const output: TGenericComponent[] = [];
    const rootIds: string[] = [];
    const seen = new Set<string>();
    const allowedRawIds = this.collectComponentIds(parsed.value);

    for (const [index, entry] of entries.entries()) {
      const root = this.normalizeComponentTree(entry, {
        allowed: options.allowed,
        allowedRawIds,
        maxComponents: options.maxComponents,
        output,
        seen,
        fallbackId: `preview-root-${ index + 1 }`,
      });
      if (root) rootIds.push(root.id);
      if (output.length >= options.maxComponents) break;
    }

    if (!rootIds.length && entries.length > 0) {
      return {
        components: [],
        rootIds: [],
        issue: 'No allowed components found.',
      };
    }

    const referencedIds = this.collectReferencedComponentIds(output);
    const visibleRoots = rootIds.filter((id) => !referencedIds.has(id));

    return {
      components: output,
      rootIds: visibleRoots.length > 0 ? visibleRoots : rootIds,
    };
  }

  private parseSource(source: unknown): { readonly value?: unknown; readonly issue?: string } {
    if (typeof source === 'string') {
      const trimmed = source.trim();
      if (!trimmed) return { value: '' };
      try {
        return { value: JSON.parse(trimmed) };
      } catch {
        return { issue: 'Invalid JSON.' };
      }
    }
    return { value: source };
  }

  private normalizeComponentTree(
    value: unknown,
    context: PreviewNormalizeContext
  ): TGenericComponent | null {
    if (context.output.length >= context.maxComponents || !isRecord(value)) return null;
    const type = String(value['type'] ?? '').trim() as TGenericComponentType;
    if (!context.allowed.has(type)) return null;

    const id = this.uniqueId(safeId(value['id'], context.fallbackId), context.seen);
    const rawConfig = isRecord(value['config']) ? value['config'] : {};
    const childComponents = Array.isArray(rawConfig['components'])
      ? rawConfig['components']
      : [];
    const childIds: string[] = [];

    childComponents.forEach((child, index) => {
      if (typeof child === 'string') {
        const childId = safeId(child, `${ id}-child-${ index + 1 }`);
        if (context.allowedRawIds.has(childId)) childIds.push(childId);
        return;
      }
      const normalized = this.normalizeComponentTree(child, {
        ...context,
        fallbackId: `${ id}-child-${ index + 1 }`,
      });
      if (normalized) childIds.push(normalized.id);
    });

    const config = this.sanitizeDeep({
      ...rawConfig,
      ...(childIds.length > 0 ? { components: childIds } : {}),
    });
    const component = this.sanitizeDeep({
      ...value,
      id,
      type,
      config,
    }) as TGenericComponent;

    context.output.push(component);
    return component;
  }

  private collectComponentIds(value: unknown): ReadonlySet<string> {
    const ids = new Set<string>();

    const visit = (entry: unknown): void => {
      if (Array.isArray(entry)) {
        entry.forEach(visit);
        return;
      }
      if (!isRecord(entry)) return;

      const id = safeId(entry['id'], '');
      if (id) ids.add(id);

      const config = entry['config'];
      if (isRecord(config) && Array.isArray(config['components'])) {
        config['components'].forEach((child) => {
          if (isRecord(child) || Array.isArray(child)) visit(child);
        });
      }
    };

    visit(value);
    return ids;
  }

  private collectReferencedComponentIds(components: readonly TGenericComponent[]): ReadonlySet<string> {
    const ids = new Set<string>();
    components.forEach((component) => {
      const config = component.config as Record<string, unknown>;
      const children = isRecord(config) ? config['components'] : undefined;
      if (!Array.isArray(children)) return;
      children.forEach((child) => {
        if (typeof child === 'string') ids.add(child);
      });
    });
    return ids;
  }

  private uniqueId(base: string, seen: Set<string>): string {
    let next = base;
    let counter = 2;
    while (seen.has(next)) {
      next = `${ base }-${ counter }`;
      counter += 1;
    }
    seen.add(next);
    return next;
  }

  private sanitizeDeep(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value
        .map((entry) => this.sanitizeDeep(entry))
        .filter((entry) => entry !== undefined);
    }
    if (!isRecord(value)) {
      if (typeof value === 'string' && FORBIDDEN_STRING.test(value)) return undefined;
      return value;
    }

    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'eventInstructions' || FORBIDDEN_KEY.test(key)) continue;
      const sanitized = this.sanitizeDeep(entry);
      if (sanitized !== undefined) next[key] = sanitized;
    }
    return next;
  }
}
