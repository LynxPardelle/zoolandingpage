import { environment } from '@/environments/environment';
import { Injectable, REQUEST, inject } from '@angular/core';

export type TPublicImageCompressionMetadata = {
    readonly optimized: boolean;
    readonly reason?: string;
    readonly sourceBytes: number;
    readonly storedBytes: number;
    readonly originalWidth?: number;
    readonly originalHeight?: number;
    readonly storedWidth?: number;
    readonly storedHeight?: number;
    readonly quality?: number | null;
    readonly pngCompressLevel?: number | null;
};

export type TPublicImageUploadRequest = {
    readonly domain: string;
    readonly assetId: string;
    readonly file: File;
    readonly pageId?: string;
    readonly assetKind?: string;
    readonly maxWidth?: number;
    readonly maxHeight?: number;
    readonly quality?: number;
    readonly pngCompressLevel?: number;
    readonly preferDirectUpload?: boolean;
    readonly directUploadMaxBytes?: number;
};

export type TPublicImageUploadResult = {
    readonly bucket: string;
    readonly key: string;
    readonly contentType: string;
    readonly publicUrl: string;
    readonly uploadStrategy: 'direct' | 'presigned-put';
    readonly compression?: TPublicImageCompressionMetadata;
};

type TUploadApiBaseResponse = {
    readonly ok: boolean;
    readonly bucket: string;
    readonly key: string;
    readonly contentType: string;
    readonly publicUrl: string;
    readonly uploadStrategy: 'direct' | 'presigned-put';
};

type TDirectUploadApiResponse = TUploadApiBaseResponse & {
    readonly uploadStrategy: 'direct';
    readonly compression?: TPublicImageCompressionMetadata;
};

type TPresignedUploadApiResponse = TUploadApiBaseResponse & {
    readonly uploadStrategy: 'presigned-put';
    readonly uploadUrl: string;
    readonly expiresIn?: number;
    readonly headers?: Record<string, string>;
};

type TUploadApiError = {
    readonly ok?: false;
    readonly error?: string;
};

const isUploadApiError = (value: unknown): value is TUploadApiError =>
    !!value && typeof value === 'object' && 'error' in (value as Record<string, unknown>);

const DIRECT_UPLOAD_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_DIRECT_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class PublicImageUploadService {
    private readonly request = inject(REQUEST, { optional: true });

    private resolveOrigin(): string {
        const requestUrl = String(this.request?.url ?? '').trim();
        if (requestUrl) {
            try {
                return new URL(requestUrl, 'http://localhost').origin;
            } catch {
                // Fall through to browser or localhost origin.
            }
        }

        if (typeof window !== 'undefined' && window.location?.origin) {
            return window.location.origin;
        }

        return 'http://localhost';
    }

    private buildUrl(path: string): string {
        const base = String(environment.apiUrl ?? '').trim().replace(/\/$/, '');
        const target = `${ base }/${ path.replace(/^\//, '') }`;
        return /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(base)
            ? new URL(target).toString()
            : new URL(target, this.resolveOrigin()).toString();
    }

    private normalizeContentType(file: File): string {
        const contentType = String(file.type ?? '').trim().toLowerCase();
        if (contentType === 'image/jpg') {
            return 'image/jpeg';
        }

        if (contentType.startsWith('image/')) {
            return contentType;
        }

        const extension = file.name.includes('.')
            ? file.name.split('.').pop()?.toLowerCase()
            : '';
        switch (extension) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'webp':
                return 'image/webp';
            case 'gif':
                return 'image/gif';
            case 'svg':
                return 'image/svg+xml';
            case 'avif':
                return 'image/avif';
            default:
                throw new Error('Only image uploads are supported');
        }
    }

    private async encodeFileToBase64(file: File): Promise<string> {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (typeof globalThis.Buffer !== 'undefined') {
            return globalThis.Buffer.from(bytes).toString('base64');
        }

        if (typeof globalThis.btoa !== 'function') {
            throw new Error('Base64 encoding is not available in this environment');
        }

        let binary = '';
        const chunkSize = 0x8000;
        for (let index = 0; index < bytes.length; index += chunkSize) {
            const chunk = bytes.subarray(index, index + chunkSize);
            binary += String.fromCharCode(...chunk);
        }
        return globalThis.btoa(binary);
    }

    private shouldUseDirectUpload(file: File, contentType: string, request: TPublicImageUploadRequest): boolean {
        if (request.preferDirectUpload === false) {
            return false;
        }

        const maxBytes = request.directUploadMaxBytes ?? DEFAULT_DIRECT_UPLOAD_MAX_BYTES;
        return DIRECT_UPLOAD_CONTENT_TYPES.has(contentType) && file.size <= maxBytes;
    }

    private async parseJsonResponse<T>(response: Response): Promise<T> {
        const raw = await response.text();
        return raw ? JSON.parse(raw) as T : {} as T;
    }

    private async postUploadRequest(payload: Record<string, unknown>): Promise<TDirectUploadApiResponse | TPresignedUploadApiResponse> {
        const response = await fetch(this.buildUrl('image-upload/presign'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const body = await this.parseJsonResponse<TDirectUploadApiResponse | TPresignedUploadApiResponse | TUploadApiError>(response);
        if (!response.ok) {
            throw new Error(String(isUploadApiError(body) ? body.error : `Image upload request failed with status ${ response.status }`));
        }

        return body as TDirectUploadApiResponse | TPresignedUploadApiResponse;
    }

    private async uploadViaPresignedUrl(file: File, presign: TPresignedUploadApiResponse, contentType: string): Promise<TPublicImageUploadResult> {
        const headers = new Headers(presign.headers ?? {});
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', contentType);
        }

        const response = await fetch(presign.uploadUrl, {
            method: 'PUT',
            headers,
            body: file,
        });

        if (!response.ok) {
            throw new Error(`S3 upload failed with status ${ response.status }`);
        }

        return {
            bucket: presign.bucket,
            key: presign.key,
            contentType: presign.contentType,
            publicUrl: presign.publicUrl,
            uploadStrategy: 'presigned-put',
        };
    }

    async uploadImage(request: TPublicImageUploadRequest): Promise<TPublicImageUploadResult> {
        const contentType = this.normalizeContentType(request.file);
        const payload: Record<string, unknown> = {
            domain: request.domain,
            pageId: request.pageId,
            assetKind: request.assetKind,
            assetId: request.assetId,
            fileName: request.file.name,
            contentType,
        };

        if (typeof request.maxWidth === 'number') {
            payload['maxWidth'] = request.maxWidth;
        }
        if (typeof request.maxHeight === 'number') {
            payload['maxHeight'] = request.maxHeight;
        }
        if (typeof request.quality === 'number') {
            payload['quality'] = request.quality;
        }
        if (typeof request.pngCompressLevel === 'number') {
            payload['pngCompressLevel'] = request.pngCompressLevel;
        }

        if (this.shouldUseDirectUpload(request.file, contentType, request)) {
            const directResponse = await this.postUploadRequest({
                ...payload,
                imageBase64: await this.encodeFileToBase64(request.file),
            }) as TDirectUploadApiResponse;

            return {
                bucket: directResponse.bucket,
                key: directResponse.key,
                contentType: directResponse.contentType,
                publicUrl: directResponse.publicUrl,
                uploadStrategy: 'direct',
                compression: directResponse.compression,
            };
        }

        const presign = await this.postUploadRequest(payload) as TPresignedUploadApiResponse;
        return await this.uploadViaPresignedUrl(request.file, presign, contentType);
    }
}
