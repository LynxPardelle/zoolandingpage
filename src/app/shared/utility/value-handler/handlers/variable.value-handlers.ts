import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { inject } from '@angular/core';
import { I18nService } from '@/app/shared/services/i18n.service';
import type { ValueHandler } from '../value-handler.types';

type TDeltaOperation = {
    readonly insert?: unknown;
    readonly attributes?: Record<string, unknown>;
};

const escapeHtml = (value: string): string => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const deltaOps = (value: unknown): readonly TDeltaOperation[] => {
    if (!isRecord(value) || !Array.isArray(value['ops'])) return [];
    return value['ops'].filter(isRecord) as TDeltaOperation[];
};

const inlineHtml = (text: string, attributes: Record<string, unknown> | undefined): string => {
    let html = escapeHtml(text);
    if (!attributes) return html;
    if (attributes['bold'] === true) html = `<strong>${ html }</strong>`;
    if (attributes['italic'] === true) html = `<em>${ html }</em>`;
    if (attributes['underline'] === true) html = `<u>${ html }</u>`;
    const link = typeof attributes['link'] === 'string' ? attributes['link'].trim() : '';
    if (link.startsWith('https://') || (link.startsWith('/') && !link.startsWith('//'))) {
        html = `<a href="${ escapeHtml(link) }">${ html }</a>`;
    }
    return html;
};

const richTextToPlainText = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (isRecord(value) && typeof value['text'] === 'string') return value['text'].trim();
    if (isRecord(value) && typeof value['html'] === 'string') {
        return value['html'].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const ops = deltaOps(value);
    if (!ops.length) return '';
    return ops
        .map((operation) => typeof operation.insert === 'string' ? operation.insert : '')
        .join('')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const richTextToHtml = (value: unknown): string => {
    if (typeof value === 'string') return escapeHtml(value).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    if (isRecord(value) && typeof value['html'] === 'string') return value['html'];
    if (isRecord(value) && typeof value['text'] === 'string') return richTextToHtml(value['text']);

    const ops = deltaOps(value);
    if (!ops.length) return '';

    const paragraphs: string[] = [];
    let current = '';

    for (const operation of ops) {
        if (typeof operation.insert !== 'string') continue;
        const pieces = operation.insert.split('\n');
        pieces.forEach((piece, index) => {
            if (piece) current += inlineHtml(piece, operation.attributes);
            if (index < pieces.length - 1) {
                if (current.trim()) paragraphs.push(`<p>${ current }</p>`);
                current = '';
            }
        });
    }

    if (current.trim()) paragraphs.push(`<p>${ current }</p>`);
    return paragraphs.join('');
};

export const variableValueHandler = (): ValueHandler => {
    const store = inject(VariableStoreService);
    return {
        id: 'var',
        resolve: (_ctx, args) => {
            const path = String(args?.[0] ?? '').trim();
            if (!path) return undefined;
            return store.get(path);
        },
    };
};

export const richTextTextOrValueHandler = (): ValueHandler => {
    const store = inject(VariableStoreService);
    return {
        id: 'richTextTextOr',
        resolve: (_ctx, args) => {
            const path = String(args?.[0] ?? '').trim();
            const fallback = String(args?.[1] ?? '');
            const value = path ? store.get(path) : undefined;
            const text = richTextToPlainText(value);
            return text || fallback;
        },
    };
};

export const richTextHtmlOrValueHandler = (): ValueHandler => {
    const store = inject(VariableStoreService);
    return {
        id: 'richTextHtmlOr',
        resolve: (_ctx, args) => {
            const path = String(args?.[0] ?? '').trim();
            const fallback = String(args?.[1] ?? '');
            const value = path ? store.get(path) : undefined;
            const html = richTextToHtml(value);
            return html || escapeHtml(fallback);
        },
    };
};

export const supportIdOrValueHandler = (): ValueHandler => {
    const store = inject(VariableStoreService);
    const i18n = inject(I18nService);
    return {
        id: 'supportIdOr',
        resolve: (_ctx, args) => {
            const path = String(args?.[0] ?? '').trim();
            const i18nKey = String(args?.[1] ?? '').trim();
            const fallback = String(args?.[2] ?? 'ID de soporte: {{ id }}');
            const value = path ? store.get(path) : undefined;
            const requestId = typeof value === 'string' ? value.trim() : '';
            return /^req-[A-Za-z0-9._:-]{1,120}$/.test(requestId)
                ? i18n.tOr(
                    i18nKey,
                    fallback.replace(/\{\{\s*id\s*\}\}/g, requestId),
                    { id: requestId },
                )
                : '';
        },
    };
};

export const variableOrValueHandler = (): ValueHandler => {
    const store = inject(VariableStoreService);
    return {
        id: 'varOr',
        resolve: (_ctx, args) => {
            const path = String(args?.[0] ?? '').trim();
            const fallback = args?.[1];
            const value = path ? store.get(path) : undefined;
            return value == null ? (fallback ?? '') : value;
        },
    };
};
