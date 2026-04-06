import { findInteractionScopeHost } from '@/app/shared/components/interaction-scope/interaction-scope.service';
import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { DomainResolverService } from '@/app/shared/services/domain-resolver.service';
import {
    PublicImageUploadService,
    type TPublicImageCompressionMetadata,
    type TPublicImageUploadResult,
} from '@/app/shared/services/public-image-upload.service';
import { inject } from '@angular/core';
import type { EventExecutionContext, EventHandler } from '../event-handler.types';

type TPublicImageUploadScopeStatus = 'idle' | 'uploading' | 'success' | 'error';

export type TPublicImageUploadScopeState = {
    readonly status: TPublicImageUploadScopeStatus;
    readonly fileName?: string;
    readonly bucket?: string;
    readonly key?: string;
    readonly publicUrl?: string;
    readonly contentType?: string;
    readonly uploadStrategy?: 'direct' | 'presigned-put';
    readonly compression?: TPublicImageCompressionMetadata;
    readonly error?: string;
    readonly updatedAt: string;
};

const isFile = (value: unknown): value is File => typeof File !== 'undefined' && value instanceof File;

const pickFile = (value: unknown): File | null => {
    if (isFile(value)) return value;
    if (Array.isArray(value)) {
        const firstFile = value.find((entry) => isFile(entry));
        return firstFile ?? null;
    }
    return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;

const asString = (value: unknown): string => String(value ?? '').trim();

const asOptionalNumber = (value: unknown): number | undefined => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const asOptionalBoolean = (value: unknown): boolean | undefined =>
    typeof value === 'boolean' ? value : undefined;

const buildUploadState = (
    status: TPublicImageUploadScopeStatus,
    fileName: string,
    extra?: Partial<Omit<TPublicImageUploadScopeState, 'status' | 'fileName' | 'updatedAt'>>,
): TPublicImageUploadScopeState => ({
    status,
    fileName: fileName || undefined,
    updatedAt: new Date().toISOString(),
    ...extra,
});

const buildSuccessState = (fileName: string, result: TPublicImageUploadResult): TPublicImageUploadScopeState =>
    buildUploadState('success', fileName, {
        bucket: result.bucket,
        key: result.key,
        publicUrl: result.publicUrl,
        contentType: result.contentType,
        uploadStrategy: result.uploadStrategy,
        compression: result.compression,
    });

export const uploadPublicImageHandler = (): EventHandler => {
    const configStore = inject(ConfigStoreService);
    const domainResolver = inject(DomainResolverService);
    const uploads = inject(PublicImageUploadService);
    const activeRequests = new Map<string, number>();
    let requestSequence = 0;

    return {
        id: 'uploadPublicImage',
        handle: async (ctx: EventExecutionContext, args: unknown[]) => {
            const scopeHost = findInteractionScopeHost(ctx.host);
            if (!scopeHost) return;

            const eventData = asRecord(ctx.event.eventData) ?? {};
            const sourceFieldId = asString(eventData['fieldId']);
            const explicitTargetFieldId = typeof args?.[0] === 'string' ? asString(args[0]) : '';
            const fileArgIndex = explicitTargetFieldId ? 1 : 0;
            const targetFieldId = explicitTargetFieldId || (sourceFieldId ? `${ sourceFieldId }Upload` : 'imageUpload');
            const file = pickFile(args?.[fileArgIndex] ?? eventData['value']);

            if (!file) {
                scopeHost.interactionScope.setFieldValue(targetFieldId, buildUploadState('idle', ''));
                return;
            }

            const assetId = asString(args?.[fileArgIndex + 1]) || targetFieldId;
            const assetKind = asString(args?.[fileArgIndex + 2]);
            const maxWidth = asOptionalNumber(args?.[fileArgIndex + 3]);
            const maxHeight = asOptionalNumber(args?.[fileArgIndex + 4]);
            const quality = asOptionalNumber(args?.[fileArgIndex + 5]);
            const pngCompressLevel = asOptionalNumber(args?.[fileArgIndex + 6]);
            const preferDirectUpload = asOptionalBoolean(args?.[fileArgIndex + 7]);
            const directUploadMaxBytes = asOptionalNumber(args?.[fileArgIndex + 8]);

            const domain = configStore.siteConfig()?.domain ?? domainResolver.resolveDomain().domain;
            const pageId = configStore.pageConfig()?.pageId;

            if (!domain) {
                scopeHost.interactionScope.setFieldValue(
                    targetFieldId,
                    buildUploadState('error', file.name, { error: 'Unable to resolve the active domain for the upload.' }),
                );
                return;
            }

            const requestId = ++requestSequence;
            activeRequests.set(targetFieldId, requestId);
            scopeHost.interactionScope.setFieldValue(targetFieldId, buildUploadState('uploading', file.name));

            try {
                const result = await uploads.uploadImage({
                    domain,
                    pageId,
                    assetId,
                    assetKind: assetKind || undefined,
                    file,
                    maxWidth,
                    maxHeight,
                    quality,
                    pngCompressLevel,
                    preferDirectUpload,
                    directUploadMaxBytes,
                });

                if (activeRequests.get(targetFieldId) !== requestId) {
                    return;
                }

                scopeHost.interactionScope.setFieldValue(targetFieldId, buildSuccessState(file.name, result));
            } catch (error) {
                if (activeRequests.get(targetFieldId) !== requestId) {
                    return;
                }

                scopeHost.interactionScope.setFieldValue(
                    targetFieldId,
                    buildUploadState('error', file.name, {
                        error: error instanceof Error ? error.message : 'Image upload failed.',
                    }),
                );
            } finally {
                if (activeRequests.get(targetFieldId) === requestId) {
                    activeRequests.delete(targetFieldId);
                }
            }
        },
    };
};
