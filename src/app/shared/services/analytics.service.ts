import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../components/utility/toast';
import { TAnalyticsEvent, TExpandedAnalytics, TTrackOptions } from '../types/analytics.type';
import { I18nService } from './i18n.service';
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly buffer: TAnalyticsEvent[] = [];
  // Events captured before consent is granted; flushed in FIFO on acceptance
  private pendingQueue: TAnalyticsEvent[] = [];
  private readonly enabled: boolean = Boolean(environment.features.analytics);
  private readonly isProduction: boolean = environment.production;
  private readonly baseUrl: string = environment.apiUrl;
  private readonly version: string = environment.apiVersion;
  private readonly events$ = new Subject<TAnalyticsEvent>();
  private hasPermission: boolean = false;
  private alreadyAskedForPermission: boolean = false;
  private readonly trackOptions: readonly TTrackOptions[] = environment.track;
  private previouslyAskedUserData: TExpandedAnalytics | undefined = undefined;
  private timesSended: number = 0;
  private readonly appName: string = environment.app.name;
  // Timer for re-prompting after snooze (kept in-memory per session)
  private snoozeTimer: ReturnType<typeof setTimeout> | null = null;
  // UI services (optional for test contexts without DI)
  constructor(private toast?: ToastService, private i18n?: I18nService) {
    this.initializePersistentCounters();
  }

  // Consent UI state (for modal content visibility)
  readonly consentVisible = signal(false);
  private consentPending?: {
    resolve: (val: boolean) => void;
    reject: (err?: unknown) => void;
    toastId?: string;
  };

  // Proactively ask for consent on app start if needed
  promptForConsentIfNeeded(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const stored = localStorage.getItem(environment.localStorage.allowAnalyticsKey);
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
      const snoozeKey = environment.localStorage.analyticsConsentSnoozeKey;
      const snooze = localStorage.getItem(snoozeKey);
      const snoozedUntil = snooze ? Number(snooze) : 0;
      const now = Date.now();

      if (stored === null && !this.alreadyAskedForPermission && now >= snoozedUntil) {
        this.alreadyAskedForPermission = true;
        const mode = environment.features.analyticsConsentUI;
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
    const evt: TAnalyticsEvent = { name, timestamp: Date.now(), ...data } as TAnalyticsEvent;
    // Always keep local buffer (for potential flush/report)
    this.buffer.push(evt);
    this.events$.next(evt);
    console.log('[analytics]', evt);
    console.log('buffer:', this.buffer);
    if (!(this.enabled || environment.features.debugMode)) return;

    // Respect a persisted decline decision: do not queue or prompt.
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(environment.localStorage.allowAnalyticsKey);
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

    // Consent already granted: send immediately
    this.previouslyAskedUserData = this.previouslyAskedUserData || await this.getAllDataFromUser();
    const fullEventData: TAnalyticsEvent & TExpandedAnalytics = { ...this.previouslyAskedUserData, ...evt };
    console.log('All Data to send:', { ...fullEventData, appName: this.appName });
    this.send({ ...fullEventData, appName: this.appName });
  }
  flush(): readonly TAnalyticsEvent[] {
    return [...this.buffer];
  }

  // Debug/stream API: subscribe to live events
  onEvent(): Observable<TAnalyticsEvent> {
    return this.events$.asObservable();
  }

  private async send(evt: TAnalyticsEvent & TExpandedAnalytics & { appName: string }): Promise<void> {
    this.timesSended++;
    console.log(`Sending analytics data to server (attempt ${ this.timesSended })...`, evt);
    // Send to server only if in production and analytics is enabled
    if (this.isProduction) {
      const url = `${ this.baseUrl }/${ this.version }/analytics`;
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evt) });
    }
  }

  async getAllDataFromUser(): Promise<TExpandedAnalytics | undefined> {
    // Get all the data collected from the user from the browser
    const data: TExpandedAnalytics = {};
    // Get browser, OS, device info, etc from the user agent
    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      if (this.hasPermission) {
        if (this.trackOptions.includes('ip')) data['ip'] = await this.getIp();
        if (this.trackOptions.includes('userAgent')) data['userAgent'] = navigator.userAgent;
        if (this.trackOptions.includes('language')) data['language'] = this.getLanguage();
        if (this.trackOptions.includes('platform')) data['platform'] = navigator.platform;
        if (this.trackOptions.includes('vendor')) data['vendor'] = navigator.vendor;
        if (this.trackOptions.includes('cookiesEnabled')) data['cookiesEnabled'] = navigator.cookieEnabled;
        if (this.trackOptions.includes('doNotTrack')) data['doNotTrack'] = navigator.doNotTrack;
        if (this.trackOptions.includes('screenWidth')) data['screenWidth'] = window.screen.width;
        if (this.trackOptions.includes('screenHeight')) data['screenHeight'] = window.screen.height;
        if (this.trackOptions.includes('colorDepth')) data['colorDepth'] = window.screen.colorDepth;
        if (this.trackOptions.includes('timezone')) data['timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (navigator.geolocation && (this.trackOptions.includes('geolocationLatitude') || this.trackOptions.includes('geolocationLongitude') || this.trackOptions.includes('geolocationAccuracy'))) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (this.trackOptions.includes('geolocationLatitude')) data['geolocationLatitude'] = position.coords.latitude;
              if (this.trackOptions.includes('geolocationLongitude')) data['geolocationLongitude'] = position.coords.longitude;
              if (this.trackOptions.includes('geolocationAccuracy')) data['geolocationAccuracy'] = position.coords.accuracy;
            },
            (error) => {
              console.error('Error getting geolocation:', error);
            }
          );
        }
        if (this.trackOptions.includes('cookies')) data['cookies'] = document.cookie;
        if (this.trackOptions.includes('battery')) data['battery'] = await this.getBatteryInfo();
        if (this.trackOptions.includes('connection')) data['connection'] = this.getNetworkInfo();
      }
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
      const allow = localStorage.getItem(environment.localStorage.allowAnalyticsKey);
      if (allow === 'true') {
        return Promise.resolve(true);
      } else {
        // Implement proper UI prompt (toast or modal based on environment)
        const mode = environment.features.analyticsConsentUI;
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
    const secs = typeof seconds === 'number' ? seconds : environment.features.analyticsConsentSnoozeSeconds;
    this.snoozeConsent(secs);
  }

  private async finishConsent(accepted: boolean): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(environment.localStorage.allowAnalyticsKey, accepted ? 'true' : 'false');
        // Clear any pending snooze stamp once a final decision is made
        try { localStorage.removeItem(environment.localStorage.analyticsConsentSnoozeKey); } catch { }
      }
      this.hasPermission = accepted;
      // Close modal if visible
      if (this.consentVisible()) this.consentVisible.set(false);
      // Dismiss toast if present
      if (this.consentPending?.toastId) this.toast?.dismiss(this.consentPending.toastId);
      this.consentPending?.resolve(accepted);

      // On accept, flush pending events in order
      if (accepted && (this.enabled || environment.features.debugMode)) {
        this.previouslyAskedUserData = this.previouslyAskedUserData || await this.getAllDataFromUser();
        const meta = this.previouslyAskedUserData;
        const queue = [...this.pendingQueue];
        this.pendingQueue = [];
        for (const evt of queue) {
          const fullEventData: TAnalyticsEvent & TExpandedAnalytics = { ...(meta || {} as any), ...evt };
          console.log('Flushing queued analytics:', { ...fullEventData, appName: this.appName });
          await this.send({ ...fullEventData, appName: this.appName });
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
      const title = 'Allow Analytics?';
      const text =
        'We use anonymous analytics to improve our services. You can change this later in your settings.';
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
          { label: 'Allow', style: 'primary', action: () => this.acceptConsent() },
          { label: 'Decline', style: 'secondary', action: () => this.declineConsent() },
          { label: 'Later', style: 'secondary', action: () => this.remindLater() },
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
        localStorage.setItem(environment.localStorage.analyticsConsentSnoozeKey, String(until));
      }
    } catch { }
    // Dismiss UI but do not resolve as accept/decline
    if (this.consentVisible()) this.consentVisible.set(false);
    if (this.consentPending?.toastId) this.toast?.dismiss(this.consentPending.toastId);
    this.consentPending = undefined;
    // Give user feedback so it doesn't look like nothing happened
    const msg = this.i18n?.t('consent.feedback.snoozed') || "We'll ask you again later.";
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
      let id = localStorage.getItem(environment.localStorage.id) || undefined;
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(environment.localStorage.id, id);
      }
      return id;
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    if (typeof sessionStorage !== 'undefined') {
      let id = sessionStorage.getItem(environment.localStorage.sessionId) || undefined;
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(environment.localStorage.sessionId, id);
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
        const storedLang = localStorage.getItem(environment.localStorage.languageKey);
        lang = storedLang || lang;
      }
    }
    return lang;
  }

  // Initialize persistent counters from localStorage
  private initializePersistentCounters(): void {
    // Track page view on initialization
    this.incrementPageViewCount();
  }

  // Persistent counter methods
  private incrementPageViewCount(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const currentCount = this.getPageViewCount();
      localStorage.setItem(environment.localStorage.pageViewCountKey, (currentCount + 1).toString());
    } catch {
      // ignore localStorage errors
    }
  }

  // Analytics statistics methods (now using persistent storage)
  getPageViewCount(): number {
    if (typeof localStorage === 'undefined') return this.buffer.filter(event => event.name === 'page_view').length;
    try {
      const stored = localStorage.getItem(environment.localStorage.pageViewCountKey);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return this.buffer.filter(event => event.name === 'page_view').length;
    }
  }

  getEventCount(eventName: string): number {
    return this.buffer.filter(event => event.name === eventName).length;
  }

  getTotalEventsCount(): number {
    return this.buffer.length;
  }

  getSessionEventCount(): number {
    // Get current session events by filtering recent events (e.g., last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.buffer.filter(event => event.timestamp >= oneHourAgo).length;
  }

  // Reset persistent counters (useful for testing or reset functionality)
  resetPageViewCount(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(environment.localStorage.pageViewCountKey);
    } catch {
      // ignore localStorage errors
    }
  }

}
