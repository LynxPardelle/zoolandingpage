import type { TSeoPaginationCanonical } from '../types/config-payloads.types';
import { normalizePositiveInteger, resolveLoopPaginationPage } from './component-orchestrator.utility';

/** Both renderers apply their existing URL sanitizer to this pagination-only result. */
export function buildPaginationCanonicalUrl(
    rawUrl: string,
    policy: TSeoPaginationCanonical,
    rawPage: unknown,
    rawPageSize: unknown,
    totalItems: number,
): string {
    const url = new URL(rawUrl);
    const pageSize = normalizePositiveInteger(rawPageSize) || policy.defaultPageSize;
    const page = resolveLoopPaginationPage(rawPage, totalItems, pageSize);
    url.search = '';
    url.hash = '';
    if (page > 1) url.searchParams.set(policy.pageParam, String(page));
    if (pageSize !== policy.defaultPageSize) url.searchParams.set(policy.pageSizeParam, String(pageSize));
    return url.toString();
}
