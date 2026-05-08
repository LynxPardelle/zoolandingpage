import { Injectable } from '@angular/core';
import type {
    TRuntimeDataSourceFieldMapping,
    TRuntimeDataSourceMapperConfig,
} from '@/app/shared/types/config-payloads.types';

export type TRuntimeDataSourceMappedResult = {
    readonly items: readonly unknown[];
};

@Injectable({ providedIn: 'root' })
export class RuntimeDataSourceMapperService {
    mapResponse(response: unknown, mapper: TRuntimeDataSourceMapperConfig | null | undefined): TRuntimeDataSourceMappedResult {
        const items = this.resolveItems(response, mapper?.itemsPath);
        const fields = this.asFieldMap(mapper?.fields);

        return {
            items: items.map((item) => this.mapItem(item, fields)),
        };
    }

    private resolveItems(response: unknown, itemsPath: string | null | undefined): readonly unknown[] {
        const path = String(itemsPath ?? '').trim();
        const raw = path ? this.resolvePath(response, path) : response;
        return Array.isArray(raw) ? raw : [];
    }

    private mapItem(item: unknown, fields: Record<string, TRuntimeDataSourceFieldMapping>): unknown {
        if (!Object.keys(fields).length) {
            return this.cloneValue(item);
        }

        return Object.entries(fields).reduce<Record<string, unknown>>((acc, [targetKey, mapping]) => {
            const path = typeof mapping === 'string' ? mapping : mapping.path;
            const fallback = typeof mapping === 'string' ? undefined : mapping.fallback;
            const value = this.resolvePath(item, path);
            acc[targetKey] = value == null ? fallback : this.cloneValue(value);
            return acc;
        }, {});
    }

    private asFieldMap(value: unknown): Record<string, TRuntimeDataSourceFieldMapping> {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, TRuntimeDataSourceFieldMapping>
            : {};
    }

    private resolvePath(root: unknown, path: string): unknown {
        const parts = String(path ?? '').trim().split('.').filter(Boolean);
        if (!parts.length) return undefined;

        let cursor: unknown = root;
        for (const part of parts) {
            if (Array.isArray(cursor) && /^\d+$/.test(part)) {
                cursor = cursor[Number(part)];
                continue;
            }

            if (!cursor || typeof cursor !== 'object' || !(part in cursor)) {
                return undefined;
            }

            cursor = (cursor as Record<string, unknown>)[part];
        }

        return cursor;
    }

    private cloneValue(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map((item) => this.cloneValue(item));
        }

        if (value && typeof value === 'object') {
            return Object.entries(value as Record<string, unknown>)
                .reduce<Record<string, unknown>>((acc, [key, entryValue]) => {
                    acc[key] = this.cloneValue(entryValue);
                    return acc;
                }, {});
        }

        return value;
    }
}
