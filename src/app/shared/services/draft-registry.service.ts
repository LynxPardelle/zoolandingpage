import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

export type TDraftRegistryEntry = {
    readonly domain: string;
    readonly pageId: string;
};

type TDraftRegistryResponse = {
    readonly drafts?: readonly TDraftRegistryEntry[];
};

@Injectable({ providedIn: 'root' })
export class DraftRegistryService {
    private readonly http = inject(HttpClient);

    private normalizeEntry(entry: TDraftRegistryEntry | null | undefined): TDraftRegistryEntry | null {
        const domain = String(entry?.domain ?? '').trim();
        const pageId = String(entry?.pageId ?? '').trim();

        if (!domain || !pageId) {
            return null;
        }

        return { domain, pageId };
    }

    listDrafts(): Observable<readonly TDraftRegistryEntry[]> {
        return this.http.get<TDraftRegistryResponse>('/api/debug/drafts').pipe(
            map((response) => {
                const normalized = (response.drafts ?? [])
                    .map((entry) => this.normalizeEntry(entry))
                    .filter((entry): entry is TDraftRegistryEntry => entry !== null);

                const seen = new Set<string>();
                const unique = normalized.filter((entry) => {
                    const key = `${ entry.domain }::${ entry.pageId }`;
                    if (seen.has(key)) {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });

                return unique.sort((left, right) => {
                    const domainCompare = left.domain.localeCompare(right.domain);
                    return domainCompare !== 0 ? domainCompare : left.pageId.localeCompare(right.pageId);
                });
            }),
            catchError(() => of([])),
        );
    }
}
