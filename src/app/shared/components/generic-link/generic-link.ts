import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '../../services/draft-runtime.service';
import { ConfigStoreService } from '../../services/config-store.service';
import { composeDomId, resolveComponentRootDomId, resolveDynamicValue, resolveStyleRecord } from '../../utility/component-orchestrator.utility';
import { navigateInCurrentWindow } from '../../utility/navigation/browser-navigation.utility';
import { resolveNavigationTarget } from '../../utility/navigation/navigation-target.utility';

import { TGenericLinkConfig } from './generic-link.types';

@Component({
  selector: 'generic-link',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-link.html',
  styleUrl: './generic-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericLink {
  private readonly configStore = inject(ConfigStoreService);

  readonly config = input.required<TGenericLinkConfig>();
  readonly componentId = input<string | undefined>(undefined);
  readonly eventInstructions = input<string | undefined>(undefined);
  readonly styles = computed(() => resolveStyleRecord(this.config().styles));

  @Output() clicked = new EventEmitter<MouseEvent>();

  text(): string {
    const t = resolveDynamicValue(this.config().text);
    if (!t) return '';
    return String(t);
  }

  id(): string | null {
    return resolveComponentRootDomId(this.config().id, this.componentId(), 'link') ?? null;
  }

  contentId(): string | null {
    return composeDomId(this.id(), 'content') ?? null;
  }

  textId(): string | null {
    return composeDomId(this.contentId(), 'text') ?? null;
  }

  projectedContentId(): string | null {
    return composeDomId(this.contentId(), 'projected') ?? null;
  }

  classes(): string {
    const raw = resolveDynamicValue(this.config().classes);
    return typeof raw === 'string' ? raw : String(raw ?? '');
  }

  ariaLabel(): string | null {
    const raw = resolveDynamicValue(this.config().ariaLabel);
    if (!raw) return null;
    return String(raw);
  }

  ariaExpanded(): boolean | null {
    const raw = resolveDynamicValue(this.config().ariaExpanded);
    return typeof raw === 'boolean' ? raw : null;
  }

  ariaControls(): string | null {
    const raw = resolveDynamicValue(this.config().ariaControls);
    return raw ? String(raw) : null;
  }

  ariaCurrent(): boolean | 'page' | 'step' | 'location' | 'true' | 'false' | null {
    const raw = resolveDynamicValue(this.config().ariaCurrent);
    return raw == null ? null : raw;
  }

  href(): string {
    return this.navigationTarget().href;
  }

  routableInternalHref(): boolean {
    const target = this.navigationTarget();
    return target.internal && !target.hashOnly && !!target.path;
  }

  routerLinkPath(): string | undefined {
    return this.routableInternalHref() ? this.navigationTarget().path ?? undefined : undefined;
  }

  routerLinkQueryParams(): Readonly<Record<string, string>> | undefined {
    return this.routableInternalHref() ? this.navigationTarget().queryParams ?? undefined : undefined;
  }

  routerLinkFragment(): string | undefined {
    return this.routableInternalHref() ? this.navigationTarget().fragment ?? undefined : undefined;
  }

  target(): string | null {
    const raw = resolveDynamicValue(this.config().target);
    if (!raw) return null;

    const next = String(raw);
    if (next === '_blank' && this.navigationTarget().internal) {
      return null;
    }

    return next;
  }

  rel(): string {
    const raw = resolveDynamicValue(this.config().rel);
    return raw ? String(raw) : 'nofollow noopener noreferrer';
  }

  componentTokensAttribute(): string | null {
    const joined = this.componentTokens().join(',');
    return joined || null;
  }

  eventInstructionsAttribute(): string | null {
    const raw = this.eventInstructions()?.trim();
    return raw ? raw : null;
  }

  componentTokens(): readonly string[] {
    return (this.config().components ?? [])
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private navigationTarget() {
    const resolved = resolveDynamicValue(this.config().href);
    const next = typeof resolved === 'string' ? resolved : String(resolved ?? '');
    return resolveNavigationTarget(next, {
      stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS,
    });
  }

  onClick(event: MouseEvent): void {
    const target = this.navigationTarget();
    const href = target.href;
    if (target.internal) {
      event.preventDefault();
      navigateInCurrentWindow(href, {
        scrollRestoration: this.config().scrollRestoration
          ?? this.configStore.siteConfig()?.runtime?.navigation?.scrollRestoration,
      });
    }
    this.clicked.emit(event);
  }
}
