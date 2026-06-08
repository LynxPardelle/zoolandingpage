import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  REQUEST,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { VariableStoreService } from '../../services/variable-store.service';
import {
  composeDomId,
  resolveComponentRootDomId,
  resolveDynamicValue,
  resolveLoopCollectionViewItems,
} from '../../utility/component-orchestrator.utility';
import { navigateInCurrentWindow } from '../../utility/navigation/browser-navigation.utility';
import type { TLoopMaterializationOptions } from '../../utility/component-orchestrator.utility';
import type {
  TGenericPaginationConfig,
  TGenericPaginationPageItem,
} from './generic-pagination.types';

@Component({
  selector: 'generic-pagination',
  standalone: true,
  imports: [],
  templateUrl: './generic-pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericPaginationComponent {
  private readonly variables = inject(VariableStoreService);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly locationRevision = signal(0);

  readonly config = input.required<TGenericPaginationConfig>();
  readonly componentId = input<string | undefined>(undefined);
  readonly hostContext = input<unknown>();

  readonly currentPage = computed(() =>
    this.readPageParam(
      this.pageParam(),
      this.defaultPage(),
      this.pageIndexBase()
    )
  );
  readonly currentPageSize = computed(() =>
    this.readPositiveIntegerParam(this.pageSizeParam(), this.defaultPageSize())
  );
  readonly filteredItems = computed(() => this.resolveFilteredItems());
  readonly totalItems = computed(() => this.resolveTotalItems());
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.currentPageSize()))
  );
  readonly boundedPage = computed(() => this.clampPage(this.currentPage()));
  readonly visible = computed(() => {
    if (this.config().hideWhenEmpty && this.totalItems() <= 0) return false;
    if (this.config().hideWhenSinglePage && this.pageCount() <= 1) return false;
    return true;
  });
  readonly pageItems = computed(() => this.buildPageItems());

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const refreshLocation = () =>
      this.locationRevision.update((value) => value + 1);
    window.addEventListener('popstate', refreshLocation);
    window.addEventListener('hashchange', refreshLocation);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('popstate', refreshLocation);
      window.removeEventListener('hashchange', refreshLocation);
    });
  }

  id(): string | null {
    return (
      resolveComponentRootDomId(
        this.config().id,
        this.componentId(),
        'pagination'
      ) ?? null
    );
  }

  listId(): string | null {
    return composeDomId(this.id(), 'list') ?? null;
  }

  classes(): string {
    return this.asString(this.config().classes);
  }

  listClasses(): string {
    return this.asString(this.config().listClasses);
  }

  linkClasses(item?: TGenericPaginationPageItem): string {
    const base = this.asString(this.config().linkClasses);
    if (item?.kind === 'page' && item.active) {
      return this.joinClasses(
        base,
        this.asString(this.config().activeLinkClasses)
      );
    }
    return base;
  }

  disabledLinkClasses(): string {
    return this.joinClasses(
      this.asString(this.config().linkClasses),
      this.asString(this.config().disabledLinkClasses)
    );
  }

  ellipsisClasses(): string {
    return this.asString(this.config().ellipsisClasses);
  }

  summaryClasses(): string {
    return this.asString(this.config().summaryClasses);
  }

  ariaLabel(): string {
    return this.asString(this.config().ariaLabel) || 'Pagination';
  }

  previousLabel(): string {
    return this.asString(this.config().previousLabel) || 'Previous';
  }

  nextLabel(): string {
    return this.asString(this.config().nextLabel) || 'Next';
  }

  showBoundaryLinks(): boolean {
    return this.config().showBoundaryLinks !== false;
  }

  previousHref(): string {
    return this.hrefForPage(
      Math.max(this.pageIndexBase(), this.boundedPage() - 1)
    );
  }

  nextHref(): string {
    return this.hrefForPage(Math.min(this.lastPage(), this.boundedPage() + 1));
  }

  previousDisabled(): boolean {
    return this.boundedPage() <= this.pageIndexBase();
  }

  nextDisabled(): boolean {
    return this.boundedPage() >= this.lastPage();
  }

  summaryText(): string {
    const template = this.asString(this.config().summaryTemplate);
    if (!template) return '';

    return template
      .replaceAll('{page}', String(this.boundedPage()))
      .replaceAll('{pageCount}', String(this.pageCount()))
      .replaceAll('{pageSize}', String(this.currentPageSize()))
      .replaceAll('{totalItems}', String(this.totalItems()));
  }

  onNavigate(event: MouseEvent, href: string, disabled = false): void {
    if (disabled) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    navigateInCurrentWindow(href);
  }

  private resolveFilteredItems(): readonly unknown[] {
    const path = String(this.config().collectionPath ?? '').trim();
    const items = path ? this.variables.getArray(path) : [];
    const view = this.config().view;
    if (!view) return items;

    return resolveLoopCollectionViewItems(items, view, this.loopOptions(), {
      applyPagination: false,
    });
  }

  private resolveTotalItems(): number {
    if (this.shouldUseConfiguredTotal()) {
      const configuredTotal = this.asPositiveInteger(
        this.variables.get(String(this.config().totalItemsPath ?? '').trim())
      );
      if (configuredTotal != null) return configuredTotal;
    }

    return this.filteredItems().length;
  }

  private shouldUseConfiguredTotal(): boolean {
    const totalPath = String(this.config().totalItemsPath ?? '').trim();
    if (!totalPath) return false;

    const filterKeys = this.config().totalItemsPathWhenNoQueryParams;
    if (!Array.isArray(filterKeys) || filterKeys.length === 0) {
      return true;
    }

    return !filterKeys.some((key) => this.hasActiveQueryParam(key));
  }

  private buildPageItems(): readonly TGenericPaginationPageItem[] {
    const pageCount = this.pageCount();
    const pageIndexBase = this.pageIndexBase();
    const currentPage = this.boundedPage();
    const maxLinks = Math.max(
      5,
      this.asPositiveInteger(this.config().maxNumericLinks) ?? 7
    );
    const firstPage = pageIndexBase;
    const lastPage = pageCount + pageIndexBase - 1;

    if (pageCount <= maxLinks) {
      return this.range(firstPage, lastPage).map((page) =>
        this.pageItem(page, currentPage)
      );
    }

    const innerSlots = maxLinks - 2;
    const half = Math.floor(innerSlots / 2);
    let start = Math.max(firstPage + 1, currentPage - half);
    let end = Math.min(lastPage - 1, start + innerSlots - 1);
    start = Math.max(firstPage + 1, end - innerSlots + 1);

    const items: TGenericPaginationPageItem[] = [
      this.pageItem(firstPage, currentPage),
    ];
    if (start > firstPage + 1) items.push({ kind: 'ellipsis', label: '...' });
    this.range(start, end).forEach((page) =>
      items.push(this.pageItem(page, currentPage))
    );
    if (end < lastPage - 1) items.push({ kind: 'ellipsis', label: '...' });
    items.push(this.pageItem(lastPage, currentPage));
    return items;
  }

  private pageItem(
    page: number,
    currentPage: number
  ): TGenericPaginationPageItem {
    return {
      kind: 'page',
      page,
      label: String(page),
      href: this.hrefForPage(page),
      active: page === currentPage,
    };
  }

  private hrefForPage(page: number): string {
    const currentUrl = this.currentUrl();
    const targetPath =
      this.asString(this.config().path) || currentUrl.pathname || '/';
    const params = new URLSearchParams(currentUrl.searchParams);
    params.set(this.pageParam(), String(page));
    params.set(this.pageSizeParam(), String(this.currentPageSize()));

    const search = params.toString();
    const fragment = this.normalizedFragment(
      this.asString(this.config().fragment) || currentUrl.hash
    );
    return `${targetPath}${search ? `?${search}` : ''}${fragment}`;
  }

  private loopOptions(): TLoopMaterializationOptions {
    return {
      sourceComponents: [],
      warnOnMissingSource: false,
      host: this.hostContext(),
      getVariable: (path) => this.variables.get(path),
      getI18n: () => undefined,
      getQueryParam: (key) =>
        this.currentUrl().searchParams.get(key) ?? undefined,
      getCurrentLanguage: () => 'es',
      resolveI18nKey: () => undefined,
    };
  }

  private pageParam(): string {
    return this.asString(this.config().pageParam) || 'page';
  }

  private pageSizeParam(): string {
    return this.asString(this.config().pageSizeParam) || 'pageSize';
  }

  private defaultPage(): number {
    return (
      this.asPositiveInteger(this.config().defaultPage) ?? this.pageIndexBase()
    );
  }

  private defaultPageSize(): number {
    return this.asPositiveInteger(this.config().defaultPageSize) ?? 4;
  }

  private pageIndexBase(): 0 | 1 {
    return this.config().pageIndexBase === 0 ? 0 : 1;
  }

  private lastPage(): number {
    return this.pageCount() + this.pageIndexBase() - 1;
  }

  private clampPage(page: number): number {
    return Math.min(this.lastPage(), Math.max(this.pageIndexBase(), page));
  }

  private readPageParam(
    key: string,
    fallback: number,
    pageIndexBase: 0 | 1
  ): number {
    const raw = this.currentUrl().searchParams.get(key);
    const parsed = Number(raw ?? fallback);
    if (!Number.isFinite(parsed) || parsed < pageIndexBase)
      return pageIndexBase;
    return Math.floor(parsed);
  }

  private readPositiveIntegerParam(key: string, fallback: number): number {
    const raw = this.currentUrl().searchParams.get(key);
    return this.asPositiveInteger(raw) ?? Math.max(1, Math.floor(fallback));
  }

  private hasActiveQueryParam(key: unknown): boolean {
    const value = this.currentUrl().searchParams.get(String(key ?? '').trim());
    if (value == null) return false;

    const normalized = value.trim().toLowerCase();
    return (
      !!normalized &&
      normalized !== 'all' &&
      normalized !== 'undefined' &&
      normalized !== 'null'
    );
  }

  private currentUrl(): URL {
    this.locationRevision();

    const requestUrl = String(this.request?.url ?? '').trim();
    if (requestUrl) {
      return new URL(requestUrl, 'http://localhost');
    }

    if (typeof window !== 'undefined' && window.location?.href) {
      return new URL(window.location.href);
    }

    return new URL('http://localhost/');
  }

  private normalizedFragment(value: string): string {
    const normalized = value.trim();
    if (!normalized) return '';
    return normalized.startsWith('#') ? normalized : `#${normalized}`;
  }

  private range(start: number, end: number): readonly number[] {
    if (end < start) return [];
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  private asString(value: unknown): string {
    const resolved = resolveDynamicValue(value as never);
    return typeof resolved === 'string' ? resolved : String(resolved ?? '');
  }

  private asPositiveInteger(value: unknown): number | undefined {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.floor(parsed);
  }

  private joinClasses(...classes: readonly string[]): string {
    return classes
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(' ');
  }
}
