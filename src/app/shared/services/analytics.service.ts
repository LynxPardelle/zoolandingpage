import { I18nService } from '@/app/shared/services/i18n.service';
import type {
  TAnalyticsConfigPayload,
  TAnalyticsQuickStatsEventConfig,
  TAnalyticsQuickStatsPageViewConfig,
  TDraftLocalStorageSlot,
} from '@/app/shared/types/config-payloads.types';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, ReplaySubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../components/generic-toast';
import { TAnalyticsEvent, TDataDropResponse, TExpandedAnalytics } from '../types/analytics.type';
import { AnalyticsCategories, AnalyticsEvents } from './analytics.events';
import { ConfigStoreService } from './config-store.service';
import { RuntimeConfigService } from './runtime-config.service';

import { QuickStatsService } from './quick-stats.service';

const DEFAULT_SCROLL_MILESTONES: readonly number[] = [25, 50, 75, 100];

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly debugEventReplaySize = 10;
  private http = inject(HttpClient);
  private readonly doc = inject(DOCUMENT);
  private readonly buffer: TAnalyticsEvent[] = [];
  // Events captured before consent is granted; flushed in FIFO on acceptance
  private pendingQueue: TAnalyticsEvent[] = [];
  private readonly isProduction: boolean = environment.production;
  private readonly baseUrl: string = environment.apiUrl;
  private readonly configStore = inject(ConfigStoreService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly quickStats = inject(QuickStatsService);
  private readonly events$ = new ReplaySubject<TAnalyticsEvent>(this.debugEventReplaySize);
  private trackingTeardowns: Array<() => void> = [];
  private hasPermission: boolean = false;
  private alreadyAskedForPermission: boolean = false;
  private previouslyAskedUserData: TExpandedAnalytics | undefined = undefined;
  private runtimeStateInitialized = false;

  // Suppression control to temporarily ignore certain event names (e.g., during programmatic actions)
  private suppressUntil = 0;
  private suppressedEvents = new Set<string>();

  /**
   * Suppress selected analytics event names until the provided epoch ms.
   * Useful for avoiding noisy section_view during smooth scrolling to anchors.
   * Pass names as AnalyticsEvents.* constants.
   */
  suppress(names: readonly string[], untilEpochMs: number): void {
    this.suppressUntil = Math.max(this.suppressUntil, untilEpochMs);
    names.forEach(n => this.suppressedEvents.add(n));
  }

  startPageEngagementTracking(config?: TAnalyticsConfigPayload | null, doc: Document = this.doc): void {
    this.stopPageEngagementTracking();

    if (typeof window === 'undefined' || typeof document === 'undefined' || !doc) {
      return;
    }

    this.startAnchorNavigationTracking(doc);
    this.startReadDepthTracking(this.resolveScrollMilestones(config?.scrollMilestones), doc);
    this.startSectionViewTracking(this.resolveSectionIds(config?.sectionIds, doc), doc);
  }

  private resolveScrollMilestones(milestones: readonly number[] | null | undefined): readonly number[] {
    const normalized = [...new Set(
      (milestones ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    )].sort((left, right) => left - right);

    return normalized.length > 0 ? normalized : DEFAULT_SCROLL_MILESTONES;
  }

  private resolveSectionIds(sectionIds: readonly string[] | null | undefined, doc: Document): readonly string[] {
    const normalized = [...new Set(
      (sectionIds ?? [])
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0)
    )];

    if (normalized.length > 0) {
      return normalized;
    }

    return Array.from(doc.querySelectorAll('section[id]'))
      .map((element) => String((element as HTMLElement).id ?? '').trim())
      .filter((value, index, collection) => value.length > 0 && collection.indexOf(value) === index);
  }

  stopPageEngagementTracking(): void {
    const teardowns = [...this.trackingTeardowns];
    this.trackingTeardowns = [];
    teardowns.forEach((teardown) => {
      try {
        teardown();
      } catch {
        // ignore cleanup errors
      }
    });
  }

  private registerTrackingCleanup(teardown: () => void): void {
    this.trackingTeardowns.push(teardown);
  }

  private resolveTransportEventName(name: string): string {
    const mapped = this.configStore.analytics()?.events?.[name];
    return typeof mapped === 'string' && mapped.trim().length > 0 ? mapped.trim() : name;
  }

  private resolveTransportCategory(category?: string): string | undefined {
    if (!category) return category;
    const mapped = this.configStore.analytics()?.categories?.[category];
    return typeof mapped === 'string' && mapped.trim().length > 0 ? mapped.trim() : category;
  }

  private resolveTransportEvent(evt: TAnalyticsEvent): TAnalyticsEvent {
    return {
      ...evt,
      name: this.resolveTransportEventName(evt.name),
      category: this.resolveTransportCategory(evt.category),
    };
  }

  pageViewEventName(): string {
    const configured = this.configStore.analytics()?.quickStats?.pageView?.event;
    return typeof configured === 'string' && configured.trim().length > 0
      ? configured.trim()
      : AnalyticsEvents.PageView;
  }

  private consentText(key: string): string {
    return this.i18n?.t(key) ?? key;
  }

  private startReadDepthTracking(milestones: readonly number[], doc: Document): void {
    const normalizedMilestones = [...new Set(
      (milestones ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    )].sort((left, right) => left - right);

    if (normalizedMilestones.length === 0) return;

    const scrollEl = this.resolveScrollElement(doc);
    if (!scrollEl) return;

    const hit = new Set<number>();
    let rafId: number | null = null;
    let active = true;

    const computeDepth = (): number => {
      const docEl = doc.documentElement;
      const body = doc.body;
      const scrollTop = Math.max(window.scrollY || 0, scrollEl.scrollTop || 0, docEl.scrollTop || 0, body?.scrollTop || 0);
      const scrollHeight = Math.max(scrollEl.scrollHeight || 0, docEl.scrollHeight || 0, body?.scrollHeight || 0, body?.offsetHeight || 0);
      const viewport = Math.max(window.innerHeight || 0, docEl.clientHeight || 0, body?.clientHeight || 0);
      const denom = Math.max(1, scrollHeight - viewport);
      const progress = Math.round((scrollTop / denom) * 100);
      return Math.min(100, Math.max(0, progress));
    };

    const cleanup = () => {
      if (!active) return;
      active = false;
      window.removeEventListener('scroll', throttled as EventListener);
      scrollEl.removeEventListener('scroll', throttled as EventListener);
      window.removeEventListener('resize', throttled as EventListener);
      window.removeEventListener('orientationchange', throttled as EventListener);
      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }
      try { mutationObserver.disconnect(); } catch { }
    };

    const onScrollOrResize = () => {
      if (!active) return;

      const depth = computeDepth();
      for (const milestone of normalizedMilestones) {
        if (depth >= milestone && !hit.has(milestone)) {
          hit.add(milestone);
          void this.track(AnalyticsEvents.ScrollDepth, {
            category: AnalyticsCategories.Navigation,
            label: `${ milestone }%`,
            value: milestone,
            meta: { depthPercent: milestone },
          });
        }
      }

      if (hit.size === normalizedMilestones.length) {
        cleanup();
      }
    };

    const throttled = () => {
      if (!active || rafId != null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        onScrollOrResize();
      });
    };

    const mutationObserver = new MutationObserver(() => onScrollOrResize());

    window.addEventListener('scroll', throttled, { passive: true });
    scrollEl.addEventListener('scroll', throttled, { passive: true });
    window.addEventListener('resize', throttled);
    window.addEventListener('orientationchange', throttled);

    try {
      mutationObserver.observe(doc.body, { childList: true, subtree: true, attributes: true, characterData: false });
    } catch {
      // no-op when the document is not ready yet
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        onScrollOrResize();
      }, 120);
    });

    this.registerTrackingCleanup(cleanup);
  }

  private startAnchorNavigationTracking(doc: Document): void {
    const onClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href^="#"]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const declaredInstructions = String(anchor.getAttribute('data-event-instructions') ?? '').trim();
      if (this.declaresNavClickTracking(declaredInstructions)) {
        return;
      }

      const rawHref = String(anchor.getAttribute('href') ?? '').trim();
      const sectionId = rawHref.replace(/^#+/, '').trim();
      if (!sectionId) {
        return;
      }

      void this.track(AnalyticsEvents.NavClick, {
        category: AnalyticsCategories.Navigation,
        label: sectionId,
        meta: {
          href: `#${ sectionId }`,
          navigationType: 'in-page',
        },
      });
    };

    doc.addEventListener('click', onClick, true);
    this.registerTrackingCleanup(() => {
      doc.removeEventListener('click', onClick, true);
    });
  }

  private declaresNavClickTracking(eventInstructions: string): boolean {
    if (!eventInstructions) {
      return false;
    }

    return eventInstructions
      .split(';')
      .map((instruction) => instruction.trim())
      .filter(Boolean)
      .some((instruction) => /^trackEvent\s*:\s*nav_click\b/i.test(instruction));
  }

  private resolveScrollElement(doc: Document): HTMLElement | null {
    const uniqueCandidates = new Set<HTMLElement>();
    const pushCandidate = (candidate: Element | null | undefined) => {
      if (candidate instanceof HTMLElement) {
        uniqueCandidates.add(candidate);
      }
    };

    pushCandidate(doc.scrollingElement);
    pushCandidate(doc.documentElement);
    pushCandidate(doc.body);

    const candidates = Array.from(uniqueCandidates);
    if (candidates.length === 0) {
      return null;
    }

    return candidates.sort((left, right) => {
      const leftScore = Math.max(left.scrollHeight - left.clientHeight, left.scrollHeight);
      const rightScore = Math.max(right.scrollHeight - right.clientHeight, right.scrollHeight);
      return rightScore - leftScore;
    })[0] ?? null;
  }

  private startSectionViewTracking(sectionIds: readonly string[], doc: Document): void {
    const ids = [...new Set(
      (sectionIds ?? [])
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0)
    )];

    if (ids.length === 0 || !('IntersectionObserver' in window)) {
      return;
    }

    const lastSeen = new Map<string, number>();
    const initialSeen = new Set<string>();
    const observedElements = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            const id = entry.target.id;
            if (!id) continue;

            const now = Date.now();
            const last = lastSeen.get(id) ?? 0;
            if (now - last <= 3_000) continue;

            lastSeen.set(id, now);
            initialSeen.add(id);
            void this.track(AnalyticsEvents.SectionView, {
              category: AnalyticsCategories.Navigation,
              label: id,
            });
          }
        }
      },
      { rootMargin: '0px 0px 80% 0px', threshold: [0.5] }
    );

    const tryObserve = () => {
      ids.forEach((id) => {
        const element = doc.getElementById(id);
        if (element && !observedElements.has(element)) {
          observedElements.add(element);
          observer.observe(element);
        }
      });
    };

    tryObserve();

    const mutationObserver = new MutationObserver(() => tryObserve());
    try {
      mutationObserver.observe(doc.body, { childList: true, subtree: true });
    } catch {
      // ignore DOM timing issues
    }

    const intervalId = setInterval(() => {
      if (ids.every((id) => initialSeen.has(id))) {
        mutationObserver.disconnect();
        clearInterval(intervalId);
      }
    }, 2_000);

    this.registerTrackingCleanup(() => {
      observer.disconnect();
      mutationObserver.disconnect();
      clearInterval(intervalId);
    });
  }
  private timesSended: number = 0;
  // Timer for re-prompting after snooze (kept in-memory per session)
  private snoozeTimer: ReturnType<typeof setTimeout> | null = null;
  // UI services (optional for test contexts without DI)
  constructor(private toast?: ToastService, private i18n?: I18nService) {
  }

  // Consent UI state (for modal content visibility)
  readonly consentVisible = signal(false);
  private consentPending?: {
    resolve: (val: boolean) => void;
    reject: (err?: unknown) => void;
    toastId?: string;
  };

  initializeRuntimeState(): void {
    if (this.runtimeStateInitialized) {
      return;
    }

    this.runtimeStateInitialized = true;
    this.initializePersistentCounters();
    this.promptForConsentIfNeeded();
  }

  // Proactively ask for consent on app start if needed
  promptForConsentIfNeeded(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      if (!this.isRemoteAnalyticsEnabled()) {
        this.hasPermission = false;
        this.alreadyAskedForPermission = true;
        return;
      }
      // If consent UI mode is 'none', auto-allow analytics and skip any prompting logic entirely.
      if (this.runtimeConfig.analyticsConsentMode() === 'none') {
        this.hasPermission = true;
        this.alreadyAskedForPermission = true; // prevent any downstream prompt triggers
        try { localStorage.setItem(this.storageKey('allowAnalytics'), 'true'); } catch { /* ignore */ }
        return;
      }
      const stored = localStorage.getItem(this.storageKey('allowAnalytics'));
      // Apply persisted decision first
      if (stored === 'true') {
        this.hasPermission = true;
        return;
      }
      if (stored === 'false') {
        this.hasPermission = false;
        // Do not prompt again automatically after a hard decline
        this.alreadyAskedForPermission = true;
        return;
      }
      // Respect snooze timestamp
      const snoozeKey = this.storageKey('analyticsConsentSnooze');
      const snooze = localStorage.getItem(snoozeKey);
      const snoozedUntil = snooze ? Number(snooze) : 0;
      const now = Date.now();

      if (stored === null && !this.alreadyAskedForPermission && now >= snoozedUntil) {
        this.alreadyAskedForPermission = true;
        const mode = this.runtimeConfig.analyticsConsentMode();
        if (mode === 'modal') {
          // Non-blocking prompt
          this.promptConsentWithModal();
        } else if (mode === 'toast') {
          this.promptConsentWithToast();
        } else {
          this.promptConsentWithSheet();
        }
      } else if (stored === null && now < snoozedUntil) {
        // Schedule re-prompt when snooze expires
        const delay = Math.max(0, snoozedUntil - now);
        this.scheduleRePrompt(delay);
      }
    } catch {
      // ignore
    }
  }

  async track(name: string, data: Omit<TAnalyticsEvent, 'name' | 'timestamp'> = {}): Promise<void> {
    /*     console.log(`Tracking event: ${ name }`, data);
     */    // Drop event when suppressed (time-bound and name-bound)
    if (Date.now() <= this.suppressUntil && this.suppressedEvents.has(name)) {
      return;
    }
    const evt: TAnalyticsEvent = { name, timestamp: Date.now(), ...data } as TAnalyticsEvent;
    // Always keep local buffer (for potential flush/report)
    /* console.log('[analytics]', evt); */
    this.buffer.push(evt);
    this.events$.next(evt);
    /* console.log('buffer:', this.buffer); */
    if (!this.isRemoteAnalyticsEnabled()) return;

    // Respect a persisted decline decision: do not queue or prompt.
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey('allowAnalytics'));
        if (stored === 'false') return;
        if (stored === 'true') this.hasPermission = true;
      }
    } catch { }

    // If consent not granted yet, queue event and trigger prompt (non-blocking)
    if (!this.hasPermission) {
      this.pendingQueue.push(evt);
      if (!this.alreadyAskedForPermission) {
        this.alreadyAskedForPermission = true;
        // Fire and forget; finishConsent() will handle flushing if accepted
        void this.askForPermissionToDoAnalyticsAndStoreCookies().then(result => {
          // hasPermission will be set in finishConsent; do nothing here
        }).catch(() => { });
      }
      return;
    }

    this.parseSend(evt);
    // Fire-and-forget counters to Quick Stats for selected events
    this.bumpQuickStatsForEvent(name);
  }
  flush(): readonly TAnalyticsEvent[] {
    return [...this.buffer];
  }

  // Debug/stream API: subscribe to live events
  onEvent(): Observable<TAnalyticsEvent> {
    return this.events$.asObservable();
  }

  private async parseSend(evt: TAnalyticsEvent) {
    // Consent already granted: send immediately
    const transportEvent = this.resolveTransportEvent(evt);
    let payload: any;
    if (this.timesSended === 0) {
      // First time: send all user data
      this.previouslyAskedUserData = this.previouslyAskedUserData || await this.getAllDataFromUser();
      payload = { ...this.previouslyAskedUserData, ...transportEvent };
    } else {
      // Subsequent: only event data + sessionId + localId
      const { sessionId, localId } = this.previouslyAskedUserData || {};
      payload = { ...transportEvent, sessionId, localId };
    }
    const appName = this.resolveAppName();
    /* console.log('Analytics Data to send:', { ...payload, appName }); */
    this.send({ ...payload, appName })?.subscribe({ next: () => { }, error: () => { } });
  }

  private resolveAppName(): string {
    return this.runtimeConfig.appIdentifier();
  }

  private storageKey(key: TDraftLocalStorageSlot): string {
    return this.runtimeConfig.resolveStorageKey(key);
  }

  private isRemoteAnalyticsEnabled(): boolean {
    return this.runtimeConfig.isAnalyticsEnabled();
  }

  private canSendRemoteQuickStats(): boolean {
    if (!this.isProduction || !this.isRemoteAnalyticsEnabled()) {
      return false;
    }

    return this.hasPermission || this.runtimeConfig.analyticsConsentMode() === 'none';
  }

  private send(evt: TAnalyticsEvent & TExpandedAnalytics & { appName: string }): Observable<TDataDropResponse> | void {
    this.timesSended++;
    if (this.runtimeConfig.isDebugMode()) console.log(`Sending analytics data to server (attempt ${ this.timesSended })...`, evt);
    // Send to server only if in production and analytics is enabled
    if (this.isProduction && this.isRemoteAnalyticsEnabled()) {
      const url = `${ this.baseUrl }/analytics`;
      return this.http.post<TDataDropResponse>(url, evt).pipe(
        tap(res => { if (this.runtimeConfig.isDebugMode()) console.log('Analytics server response:', res) })
      );
    }
  }

  async getAllDataFromUser(): Promise<TExpandedAnalytics | undefined> {
    // Get all the data collected from the user from the browser
    const data: TExpandedAnalytics = {};
    const trackOptions = this.runtimeConfig.track();
    // Get browser, OS, device info, etc from the user agent
    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      if (this.hasPermission) {
        if (trackOptions.includes('ip')) data['ip'] = await this.getIp();
        if (trackOptions.includes('userAgent')) data['userAgent'] = navigator.userAgent;
        if (trackOptions.includes('language')) data['language'] = this.getLanguage();
        if (trackOptions.includes('platform')) data['platform'] = navigator.platform;
        if (trackOptions.includes('vendor')) data['vendor'] = navigator.vendor;
        if (trackOptions.includes('cookiesEnabled')) data['cookiesEnabled'] = navigator.cookieEnabled;
        if (trackOptions.includes('doNotTrack')) data['doNotTrack'] = navigator.doNotTrack;
        if (trackOptions.includes('screenWidth')) data['screenWidth'] = window.screen.width;
        if (trackOptions.includes('screenHeight')) data['screenHeight'] = window.screen.height;
        if (trackOptions.includes('colorDepth')) data['colorDepth'] = window.screen.colorDepth;
        if (trackOptions.includes('timezone')) data['timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (navigator.geolocation && (trackOptions.includes('geolocationLatitude') || trackOptions.includes('geolocationLongitude') || trackOptions.includes('geolocationAccuracy'))) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (trackOptions.includes('geolocationLatitude')) data['geolocationLatitude'] = position.coords.latitude;
              if (trackOptions.includes('geolocationLongitude')) data['geolocationLongitude'] = position.coords.longitude;
              if (trackOptions.includes('geolocationAccuracy')) data['geolocationAccuracy'] = position.coords.accuracy;
            },
            (error) => {
              console.error('Error getting geolocation:', error);
            }
          );
        }
        if (trackOptions.includes('cookies')) data['cookies'] = document.cookie;
        if (trackOptions.includes('battery')) data['battery'] = await this.getBatteryInfo();
        if (trackOptions.includes('connection')) data['connection'] = this.getNetworkInfo();
      }
      data['cssCreationTime'] = this.getFirstCSSCreationTime();
      data['localId'] = this.getLocalId();
      data['sessionId'] = this.getSessionId();
      return data;
    } else {
      return undefined;
    }
  }

  private async getIp(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json();
        return data.ip;
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching IP address:', error);
      return undefined;
    }
  }

  private async getBatteryInfo(): Promise<string | undefined> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return JSON.stringify({
          charging: battery.charging,
          level: battery.level,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        });
      } catch (error) {
        console.error('Error getting battery info:', error);
        return undefined;
      }
    }
    return undefined;
  }

  private getNetworkInfo(): string | undefined {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      return JSON.stringify({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    }
    return undefined;
  }

  private askForPermissionToDoAnalyticsAndStoreCookies(): Promise<boolean> {
    if (typeof localStorage !== 'undefined') {
      // Short-circuit: consent UI disabled -> treat as accepted
      if (this.runtimeConfig.analyticsConsentMode() === 'none') {
        try { localStorage.setItem(this.storageKey('allowAnalytics'), 'true'); } catch { }
        this.hasPermission = true;
        return Promise.resolve(true);
      }
      const allow = localStorage.getItem(this.storageKey('allowAnalytics'));
      if (allow === 'true') {
        return Promise.resolve(true);
      } else {
        // Implement proper UI prompt (toast or modal based on environment)
        const mode = this.runtimeConfig.analyticsConsentMode();
        if (mode === 'modal') {
          return this.promptConsentWithModal();
        }
        return this.promptConsentWithToast();
      }
    }
    return Promise.resolve(false);
  }

  // Exposed handlers for UI bindings
  acceptConsent(): void {
    void this.finishConsent(true);
  }
  declineConsent(): void {
    void this.finishConsent(false);
  }

  // Expose a reminder action to UI (e.g., "Later")
  remindLater(seconds?: number): void {
    const secs = typeof seconds === 'number' ? seconds : this.runtimeConfig.analyticsConsentSnoozeSeconds();
    this.snoozeConsent(secs);
  }

  private async finishConsent(accepted: boolean): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey('allowAnalytics'), accepted ? 'true' : 'false');
        // Clear any pending snooze stamp once a final decision is made
        try { localStorage.removeItem(this.storageKey('analyticsConsentSnooze')); } catch { }
      }
      this.hasPermission = accepted;
      // Close modal if visible
      if (this.consentVisible()) this.consentVisible.set(false);
      // Dismiss toast if present
      if (this.consentPending?.toastId) this.toast?.dismiss(this.consentPending.toastId);
      this.consentPending?.resolve(accepted);

      // On accept, flush pending events in order
      if (accepted && this.isRemoteAnalyticsEnabled()) {
        this.previouslyAskedUserData = this.previouslyAskedUserData || await this.getAllDataFromUser();
        const meta = this.previouslyAskedUserData;
        const queue = [...this.pendingQueue];
        this.pendingQueue = [];
        for (const evt of queue) {
          await this.parseSend(evt);
        }
      }

      // On decline, drop any queued events
      if (!accepted) {
        this.pendingQueue = [];
      }
    } finally {
      this.consentPending = undefined;
    }
  }

  private promptConsentWithToast(): Promise<boolean> {
    if (this.consentPending) return new Promise(resolve => this.consentPending!.resolve = resolve);
    return new Promise<boolean>((resolve, reject) => {
      this.consentPending = { resolve, reject };
      const title = this.consentText('consent.title');
      const text = this.consentText('consent.intro');
      const allowLabel = this.consentText('consent.actions.allow');
      const declineLabel = this.consentText('consent.actions.decline');
      const laterLabel = this.consentText('consent.actions.later');
      if (!this.toast) {
        // Fallback (e.g., unit tests without DI/UI)
        const ok = typeof confirm !== 'undefined' ? confirm(`${ title }\n\n${ text }`) : false;
        this.finishConsent(ok);
        return;
      }
      const toastId = this.toast.show({
        level: 'info',
        title,
        text,
        autoCloseMs: 0,
        actions: [
          { label: allowLabel, style: 'primary', action: () => this.acceptConsent() },
          { label: declineLabel, style: 'secondary', action: () => this.declineConsent() },
          { label: laterLabel, style: 'secondary', action: () => this.remindLater() },
        ],
      });
      this.consentPending.toastId = toastId;
    });
  }

  private promptConsentWithModal(): Promise<boolean> {
    if (this.consentPending) return new Promise(resolve => this.consentPending!.resolve = resolve);
    return new Promise<boolean>((resolve, reject) => {
      this.consentPending = { resolve, reject };
      // Signal AppShell to open a modal with consent content
      this.consentVisible.set(true);
    });
  }

  private promptConsentWithSheet(): Promise<boolean> {
    // Sheet presentation uses toast host visually; same logic as toast but we may later style via position
    return this.promptConsentWithToast();
  }

  private snoozeConsent(seconds: number): void {
    const secs = Math.max(1, seconds);
    const until = Date.now() + secs * 1000;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey('analyticsConsentSnooze'), String(until));
      }
    } catch { }
    // Dismiss UI but do not resolve as accept/decline
    if (this.consentVisible()) this.consentVisible.set(false);
    if (this.consentPending?.toastId) this.toast?.dismiss(this.consentPending.toastId);
    this.consentPending = undefined;
    // Give user feedback so it doesn't look like nothing happened
    const msg = this.consentText('consent.feedback.snoozed');
    this.toast?.info(msg, { autoCloseMs: 4000 });
    // Keep alreadyAskedForPermission true until the snooze ends, then reset and prompt
    this.scheduleRePrompt(secs * 1000);
  }

  private scheduleRePrompt(delayMs: number): void {
    if (this.snoozeTimer) {
      clearTimeout(this.snoozeTimer);
      this.snoozeTimer = null;
    }
    // If delay is 0, prompt on next tick
    const ms = Math.max(0, Math.floor(delayMs));
    this.snoozeTimer = setTimeout(() => {
      // Reset the flag so the prompt can show again
      this.alreadyAskedForPermission = false;
      // Try prompting again (respects current localStorage state)
      this.promptForConsentIfNeeded();
    }, ms);
  }

  private getLocalId(): string | undefined {
    if (typeof localStorage !== 'undefined') {
      const storageKey = this.storageKey('id');
      let id = localStorage.getItem(storageKey) || undefined;
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(storageKey, id);
      }
      return id;
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    if (typeof sessionStorage !== 'undefined') {
      const storageKey = this.storageKey('sessionId');
      let id = sessionStorage.getItem(storageKey) || undefined;
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(storageKey, id);
      }
      return id;
    }
    return undefined;
  }

  private getLanguage(): string | undefined {
    let lang = undefined
    if (typeof navigator !== 'undefined') {
      lang = navigator.language || undefined;
      if (typeof localStorage !== 'undefined') {
        const storedLang = localStorage.getItem(this.storageKey('language'));
        lang = storedLang || lang;
      }
    }
    return lang;
  }

  // Initialize persistent counters from localStorage
  private initializePersistentCounters(): void {
    // Track page view on initialization
    this.incrementPageViewCount();
    // Also bump remote counter (non-blocking)
    try { this.bumpRemotePageView(); } catch { /* ignore */ }
  }

  // Persistent counter methods
  private incrementPageViewCount(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const currentCount = this.getPageViewCount();
      localStorage.setItem(this.storageKey('pageViewCount'), (currentCount + 1).toString());
    } catch {
      // ignore localStorage errors
    }
  }

  private remotePageViewConfig(): TAnalyticsQuickStatsPageViewConfig | null {
    const pageView = this.configStore.analytics()?.quickStats?.pageView;
    return pageView && typeof pageView.path === 'string' && pageView.path.trim().length > 0 ? pageView : null;
  }

  private remoteEventQuickStats(): readonly TAnalyticsQuickStatsEventConfig[] {
    const events = this.configStore.analytics()?.quickStats?.events;
    return Array.isArray(events) ? events.filter((entry) => typeof entry.path === 'string' && entry.path.trim().length > 0) : [];
  }

  private bumpRemotePageView(): void {
    if (!this.canSendRemoteQuickStats()) return;
    const pageView = this.remotePageViewConfig();
    if (!pageView) return;
    this.quickStats.inc(pageView.path, pageView.by ?? 1).subscribe({
      next: () => { },
      error: () => {
        if (this.runtimeConfig.isDebugMode()) {
          console.warn('Quick stats page view increment failed.');
        }
      },
    });
  }

  private bumpQuickStatsForEvent(name: string): void {
    if (!this.canSendRemoteQuickStats()) return;
    const bindings = this.remoteEventQuickStats().filter((entry) => entry.name === name);
    if (bindings.length === 0) {
      return;
    }

    bindings.forEach((entry) => {
      this.quickStats.inc(entry.path, entry.by ?? 1).subscribe({
        next: () => { },
        error: () => {
          if (this.runtimeConfig.isDebugMode()) {
            console.warn(`Quick stats increment failed for event "${ name }".`);
          }
        },
      });
    });
  }

  // Analytics statistics methods (now using persistent storage)
  getPageViewCount(): number {
    const pageView = this.remotePageViewConfig();
    const remoteCount = pageView ? this.quickStats.getNumber(pageView.path) : undefined;
    if (typeof remoteCount === 'number') {
      return remoteCount;
    }
    if (typeof localStorage === 'undefined') return this.buffer.filter(event => event.name === 'page_view').length;
    try {
      const stored = localStorage.getItem(this.storageKey('pageViewCount'));
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return this.buffer.filter(event => event.name === 'page_view').length;
    }
  }

  getEventCount(eventName: string): number {
    const matchingBindings = this.remoteEventQuickStats().filter((entry) => entry.name === eventName);
    if (matchingBindings.length > 0) {
      return matchingBindings.reduce((count, entry) => count + (this.quickStats.getNumber(entry.path) ?? 0), 0);
    }
    return 0;
  }

  getTotalEventsCount(): number {
    return this.buffer.length;
  }

  getSessionEventCount(): number {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.buffer.filter(event => event.timestamp >= oneHourAgo).length;
  }

  // Reset persistent counters (useful for testing or reset functionality)
  resetPageViewCount(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(this.storageKey('pageViewCount'));
    } catch {
      // ignore localStorage errors
    }
  }

  getFirstCSSCreationTime(): number | undefined {
    try {
      if (typeof document === 'undefined') return undefined;
      const ankTimer = document.getElementById('ankTimer');
      if (!ankTimer) return undefined;
      const innerText = ankTimer.innerText;
      const XXDotXXmsRegex = new RegExp(/(\d+\.\d+)ms/);
      const match = innerText.match(XXDotXXmsRegex);
      if (match && match[1]) {
        const timeMs = parseFloat(match[1]);
        return timeMs;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error('Error getting first CSS creation time:', error);
      return undefined;
    }
  }


}
