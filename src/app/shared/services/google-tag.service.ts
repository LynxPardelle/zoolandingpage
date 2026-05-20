import type {
  TGoogleTagConfig,
  TGoogleTagConversionConfig,
  TGoogleTagConversionValue,
  TGoogleTagEventMappingConfig,
} from '@/app/shared/types/config-payloads.types';
import type { TAnalyticsEvent } from '../types/analytics.type';
import { AnalyticsEvents } from './analytics.events';
import { RuntimeConfigService } from './runtime-config.service';
import { Injectable, inject } from '@angular/core';

type TStoredAdAttribution = {
  readonly params: Record<string, string>;
  readonly expiresAt: number;
};

const AD_ATTRIBUTION_PARAMS = [
  'gclid',
  'gbraid',
  'wbraid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

const SENSITIVE_META_KEY_PATTERN = /(email|mail|phone|telefono|tel[eé]fono|whatsapp.*phone|name|nombre|address|direcci[oó]n|rfc|curp|href|url)/i;
const SENSITIVE_URL_QUERY_PARAM_PATTERN = /(email|mail|phone|telefono|tel[eé]fono|whatsapp.*phone|address|direcci[oó]n|rfc|curp)/i;
const AUTOMATED_AUDIT_USER_AGENT_PATTERN = /(chrome-lighthouse|lighthouse|pagespeed|gtmetrix|pingdom|webpagetest|speedcurve|headlesschrome)/i;
const DEFAULT_EVENT_CALLBACK_TIMEOUT_MS = 200;
const DEFAULT_CONVERSION_TIMEOUT_MS = 800;

@Injectable({ providedIn: 'root' })
export class GoogleTagService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      this.captureAttributionFromLocation();
      return;
    }

    this.initialized = true;
    this.ensureDataLayer();
    this.captureAttributionFromLocation();
  }

  async forwardEvent(evt: TAnalyticsEvent): Promise<void> {
    const config = this.activeConfig();
    if (!config) {
      return;
    }

    this.initialize();
    const eventName = this.resolveEventName(config, evt.name);
    const eventParams = this.buildEventParams(evt, eventName, this.resolveEventParams(config, evt.name));
    await this.sendGoogleEvent(eventName, eventParams);

    const conversions = this.resolveConversions(config, evt.name);
    if (conversions.length === 0) {
      return;
    }

    await Promise.all(conversions.map((conversion) => this.sendConversion(conversion, eventParams)));
  }

  private activeConfig(): TGoogleTagConfig | null {
    const runtimeAnalytics = typeof (this.runtimeConfig as any).analytics === 'function'
      ? (this.runtimeConfig as any).analytics()
      : null;
    const config = runtimeAnalytics?.googleTag as TGoogleTagConfig | undefined;
    if (!config?.enabled || this.isAutomatedAuditUserAgent()) {
      return null;
    }

    const hasDestination = this.listMeasurementIds(config).length > 0
      || this.listAdsIds(config).length > 0
      || this.cleanString(config.gtmId).length > 0;
    if (!hasDestination) {
      return null;
    }

    const environment = this.resolveRuntimeEnvironment();
    const gate = config.environments?.[environment];
    return gate === false ? null : config;
  }

  private resolveRuntimeEnvironment(): 'local' | 'test' | 'production' {
    if (typeof window !== 'undefined') {
      const raw = this.cleanString((window as any).__ZLP_RUNTIME_ENV__);
      if (raw === 'local' || raw === 'test' || raw === 'production') {
        return raw;
      }

      const hostname = this.cleanString(window.location?.hostname).toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return 'local';
      }
      if (hostname.startsWith('test.') || hostname.includes('.test.')) {
        return 'test';
      }
    }

    return 'production';
  }

  private listMeasurementIds(config: TGoogleTagConfig): readonly string[] {
    return [...(config.measurementIds ?? []), ...(config.ga4Ids ?? [])]
      .map((entry) => this.cleanString(entry))
      .filter((entry, index, entries) => entry.length > 0 && entries.indexOf(entry) === index);
  }

  private listAdsIds(config: TGoogleTagConfig): readonly string[] {
    return (config.adsIds ?? [])
      .map((entry) => this.cleanString(entry))
      .filter((entry, index, entries) => entry.length > 0 && entries.indexOf(entry) === index);
  }

  private ensureDataLayer(): unknown[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const target = window as any;
    target.dataLayer = Array.isArray(target.dataLayer) ? target.dataLayer : [];
    return target.dataLayer;
  }

  private resolveEventName(config: TGoogleTagConfig, internalName: string): string {
    const mapping = config.events?.[internalName];
    if (typeof mapping === 'string') {
      return this.cleanString(mapping) || internalName;
    }

    return this.cleanString(mapping?.name) || internalName;
  }

  private resolveEventParams(config: TGoogleTagConfig, internalName: string): Record<string, unknown> {
    const mapping = config.events?.[internalName];
    if (typeof mapping !== 'object' || Array.isArray(mapping)) {
      return {};
    }

    return this.sanitizeMeta((mapping as TGoogleTagEventMappingConfig).params);
  }

  private resolveConversions(config: TGoogleTagConfig, internalName: string): readonly TGoogleTagConversionConfig[] {
    const eventMapping = config.events?.[internalName];
    const mappedConversions = typeof eventMapping === 'object' && !Array.isArray(eventMapping)
      ? (eventMapping as TGoogleTagEventMappingConfig).conversions ?? []
      : [];
    const conversionValue = config.conversions?.[internalName];

    return [
      ...mappedConversions,
      ...this.normalizeConversionValue(conversionValue),
    ].filter((entry) => !!this.resolveConversionSendTo(entry));
  }

  private normalizeConversionValue(value: TGoogleTagConversionValue | undefined): readonly TGoogleTagConversionConfig[] {
    if (!value) {
      return [];
    }

    if (typeof value === 'string') {
      return [{ sendTo: value }];
    }

    if (Array.isArray(value)) {
      return value as readonly TGoogleTagConversionConfig[];
    }

    return [value as TGoogleTagConversionConfig];
  }

  private buildEventParams(
    evt: TAnalyticsEvent,
    eventName: string,
    mappedParams: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const isPageView = evt.name === AnalyticsEvents.PageView || eventName === AnalyticsEvents.PageView;
    const params: Record<string, unknown> = {
      event_category: evt.category,
      event_label: this.cleanEventLabel(evt.label, isPageView),
      value: evt.value,
      ...this.sanitizeMeta(evt.meta),
      ...mappedParams,
      ...this.readStoredAttribution(),
    };

    if (isPageView) {
      params['page_title'] = typeof document !== 'undefined' ? document.title : undefined;
      params['page_location'] = this.cleanCurrentUrl();
      params['page_path'] = this.cleanCurrentPath();
    }

    Object.keys(params).forEach((key) => {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        delete params[key];
      }
    });

    return params;
  }

  private sendGoogleEvent(eventName: string, params: Record<string, unknown>): Promise<void> {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    const target = window as any;
    if (typeof target.gtag === 'function') {
      return this.sendGtagEventWithCallback(eventName, params, DEFAULT_EVENT_CALLBACK_TIMEOUT_MS);
    }

    this.ensureDataLayer().push({ event: eventName, ...params });
    return Promise.resolve();
  }

  private sendGtagEventWithCallback(
    eventName: string,
    params: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<void> {
    const target = window as any;

    return new Promise<void>((resolve) => {
      let done = false;
      let timeoutHandle: number | undefined;
      const finish = () => {
        if (done) return;
        done = true;
        if (timeoutHandle !== undefined) {
          window.clearTimeout(timeoutHandle);
        }
        resolve();
      };

      timeoutHandle = window.setTimeout(finish, timeoutMs);
      try {
        target.gtag('event', eventName, {
          ...params,
          event_callback: finish,
        });
      } catch {
        finish();
      }
    });
  }

  private sendConversion(
    conversion: TGoogleTagConversionConfig,
    baseParams: Record<string, unknown>,
  ): Promise<void> {
    const sendTo = this.resolveConversionSendTo(conversion);
    if (!sendTo || typeof window === 'undefined') {
      return Promise.resolve();
    }

    const params: Record<string, unknown> = {
      ...baseParams,
      send_to: sendTo,
      value: conversion.value,
      currency: conversion.currency,
    };

    Object.keys(params).forEach((key) => {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        delete params[key];
      }
    });

    const target = window as any;
    if (typeof target.gtag !== 'function') {
      this.ensureDataLayer().push({ event: 'conversion', ...params });
      return Promise.resolve();
    }

    return this.sendGtagEventWithCallback('conversion', params, DEFAULT_CONVERSION_TIMEOUT_MS);
  }

  private resolveConversionSendTo(conversion: TGoogleTagConversionConfig): string {
    const explicit = this.cleanString(conversion.sendTo);
    if (explicit) {
      return explicit;
    }

    const adsId = this.cleanString(conversion.adsId);
    const label = this.cleanString(conversion.label);
    return adsId && label ? `${ adsId }/${ label }` : '';
  }

  private captureAttributionFromLocation(): void {
    const config = this.activeConfig();
    if (!config || typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search ?? '');
    const captured: Record<string, string> = {};

    AD_ATTRIBUTION_PARAMS.forEach((key) => {
      const value = this.cleanString(params.get(key));
      if (value) {
        captured[key] = value;
      }
    });

    if (Object.keys(captured).length === 0) {
      return;
    }

    const ttlDays = Math.max(0, Number(config.attribution?.ttlDays ?? 90));
    const payload: TStoredAdAttribution = {
      params: captured,
      expiresAt: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
    };

    try {
      this.resolveAttributionStorage(config)?.setItem(
        this.runtimeConfig.resolveStorageKey('adAttribution'),
        JSON.stringify(payload),
      );
    } catch {
      // Ignore blocked storage.
    }
  }

  private readStoredAttribution(): Record<string, string> {
    const config = this.activeConfig();
    if (!config) {
      return {};
    }

    try {
      const storage = this.resolveAttributionStorage(config);
      const raw = storage?.getItem(this.runtimeConfig.resolveStorageKey('adAttribution'));
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw) as TStoredAdAttribution;
      if (!parsed?.params || Date.now() > Number(parsed.expiresAt ?? 0)) {
        storage?.removeItem(this.runtimeConfig.resolveStorageKey('adAttribution'));
        return {};
      }

      return Object.fromEntries(
        Object.entries(parsed.params)
          .filter(([key, value]) => (AD_ATTRIBUTION_PARAMS as readonly string[]).includes(key) && this.cleanString(value).length > 0),
      );
    } catch {
      return {};
    }
  }

  private resolveAttributionStorage(config: TGoogleTagConfig): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return config.attribution?.storage === 'local' ? window.localStorage : window.sessionStorage;
  }

  private cleanCurrentUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const url = new URL(window.location.href);
    Array.from(url.searchParams.keys()).forEach((key) => {
      if ((AD_ATTRIBUTION_PARAMS as readonly string[]).includes(key) || SENSITIVE_URL_QUERY_PARAM_PATTERN.test(key)) {
        url.searchParams.delete(key);
      }
    });
    url.hash = '';
    return url.toString();
  }

  private cleanCurrentPath(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    return this.cleanUrlPathLabel(window.location.href);
  }

  private cleanEventLabel(label: unknown, isPageView: boolean): string | undefined {
    const value = this.cleanString(label);
    if (!value) {
      return undefined;
    }

    return isPageView ? this.cleanUrlPathLabel(value) : value;
  }

  private cleanUrlPathLabel(value: string): string {
    try {
      const base = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://zoolandingpage.local';
      const url = new URL(value, base);
      Array.from(url.searchParams.keys()).forEach((key) => {
        if ((AD_ATTRIBUTION_PARAMS as readonly string[]).includes(key) || SENSITIVE_URL_QUERY_PARAM_PATTERN.test(key)) {
          url.searchParams.delete(key);
        }
      });
      url.hash = '';
      return `${ url.pathname || '/' }${ url.search || '' }`;
    } catch {
      return value.split(/[?#]/, 1)[0] || '/';
    }
  }

  private sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!meta) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(meta)
        .filter(([key, value]) => !SENSITIVE_META_KEY_PATTERN.test(key) && this.isSafeMetaValue(value))
        .map(([key, value]) => [key, value]),
    );
  }

  private isSafeMetaValue(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.trim().length <= 200 && !/@/.test(value) && !/^https?:\/\//i.test(value);
    }

    return typeof value === 'number' || typeof value === 'boolean';
  }

  private isAutomatedAuditUserAgent(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return navigator.webdriver === true
      || AUTOMATED_AUDIT_USER_AGENT_PATTERN.test(String(navigator.userAgent ?? ''));
  }

  private cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
