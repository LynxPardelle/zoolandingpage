# Analytics & Tracking 📊

This document outlines the comprehensive analytics and tracking system for the Zoolandingpage project.

## 🎯 Analytics Overview

The analytics system tracks user behavior, conversion metrics, and performance data to optimize the landing page effectiveness and demonstrate analytics capabilities to potential clients.

### Key Objectives

1. **User Behavior Analysis**: Understand how visitors interact with the landing page
2. **Conversion Tracking**: Monitor form submissions, CTA clicks, and engagement
3. **Performance Monitoring**: Track Core Web Vitals and page performance
4. **Real-time Insights**: Provide live analytics dashboard
5. **Privacy Compliance**: GDPR/CCPA compliant data collection

## 🏗 Architecture

### Service Structure

```typescript
// Core analytics service architecture
@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private events$ = new Subject<AnalyticsEvent>();
  private session: AnalyticsSession;
  private websocket: WebSocketService;

  constructor() {
    this.initializeSession();
    this.setupEventProcessing();
  }

  // Public API
  trackEvent(event: AnalyticsEvent): void;
  trackPageView(page: string): void;
  trackConversion(type: ConversionType, data?: any): void;
  getSessionData(): AnalyticsSession;
  generateReport(): AnalyticsReport;
}
```

### Event Types

```typescript
type AnalyticsEventType =
  | 'page_view'
  | 'page_exit'
  | 'scroll_depth'
  | 'click'
  | 'form_interaction'
  | 'form_submission'
  | 'tutorial_step'
  | 'cta_click'
  | 'language_switch'
  | 'video_play'
  | 'download'
  | 'error'
  | 'performance';

type AnalyticsEvent = {
  type: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  userId?: string;
  page: string;
  data?: Record<string, any>;
  userAgent: string;
  viewport: { width: number; height: number };
  referrer?: string;
};
```

## 🔧 Implementation

### Core Analytics Service

```typescript
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Subject, fromEvent } from 'rxjs';
import { throttleTime, distinctUntilChanged } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private events$ = new Subject<AnalyticsEvent>();
  private session$ = new BehaviorSubject<AnalyticsSession>(this.createSession());
  private isClient: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private websocket: WebSocketService,
    private storage: StorageService
  ) {
    this.isClient = isPlatformBrowser(this.platformId);

    if (this.isClient) {
      this.initializeTracking();
    }
  }

  private initializeTracking(): void {
    // Auto-track page views
    this.trackPageView();

    // Auto-track scroll depth
    this.setupScrollTracking();

    // Auto-track page visibility
    this.setupVisibilityTracking();

    // Auto-track errors
    this.setupErrorTracking();

    // Process events
    this.setupEventProcessing();
  }

  // Public API
  trackEvent(type: AnalyticsEventType, data?: any): void {
    if (!this.isClient) return;

    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      page: window.location.pathname,
      data,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      referrer: document.referrer,
    };

    this.events$.next(event);
  }

  trackPageView(page?: string): void {
    this.trackEvent('page_view', {
      page: page || window.location.pathname,
      title: document.title,
      url: window.location.href,
    });
  }

  trackClick(element: string, context?: any): void {
    this.trackEvent('click', {
      element,
      context,
      coordinates: context?.coordinates,
    });
  }

  trackFormInteraction(formId: string, field: string, action: string): void {
    this.trackEvent('form_interaction', {
      formId,
      field,
      action,
    });
  }

  trackConversion(type: ConversionType, data?: any): void {
    this.trackEvent('conversion', {
      conversionType: type,
      value: data?.value,
      ...data,
    });
  }

  private setupScrollTracking(): void {
    let maxScrollDepth = 0;

    fromEvent(window, 'scroll')
      .pipe(throttleTime(1000))
      .subscribe(() => {
        const scrollTop = window.pageYOffset;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollDepth = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);

        if (scrollDepth > maxScrollDepth) {
          maxScrollDepth = scrollDepth;
          this.trackEvent('scroll_depth', { depth: scrollDepth });
        }
      });
  }

  private setupVisibilityTracking(): void {
    let startTime = Date.now();

    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (document.hidden) {
        const timeSpent = Date.now() - startTime;
        this.trackEvent('page_exit', { timeSpent });
      } else {
        startTime = Date.now();
      }
    });
  }

  private setupErrorTracking(): void {
    window.addEventListener('error', event => {
      this.trackEvent('error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', event => {
      this.trackEvent('error', {
        type: 'unhandled_promise_rejection',
        reason: event.reason,
      });
    });
  }

  private setupEventProcessing(): void {
    this.events$.subscribe(event => {
      // Send to WebSocket
      this.websocket.send('analytics', event);

      // Store locally for offline support
      this.storage.addAnalyticsEvent(event);

      // Update session statistics
      this.updateSessionStats(event);
    });
  }

  private createSession(): AnalyticsSession {
    return {
      id: this.generateSessionId(),
      startTime: Date.now(),
      pageViews: 0,
      events: [],
      userAgent: this.isClient ? navigator.userAgent : '',
      language: this.isClient ? navigator.language : 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
```

### WebSocket Integration

```typescript
@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket$: WebSocketSubject<any> | null = null;
  private connectionStatus$ = new BehaviorSubject<'connected' | 'disconnected' | 'connecting'>('disconnected');

  constructor() {
    this.connect();
  }

  connect(): void {
    if (!environment.websocketUrl) return;

    this.connectionStatus$.next('connecting');

    this.socket$ = webSocket({
      url: environment.websocketUrl,
      openObserver: {
        next: () => this.connectionStatus$.next('connected'),
      },
      closeObserver: {
        next: () => {
          this.connectionStatus$.next('disconnected');
          this.reconnect();
        },
      },
    });
  }

  send(channel: string, data: any): void {
    if (this.socket$ && this.connectionStatus$.value === 'connected') {
      this.socket$.next({ channel, data });
    } else {
      // Queue for when connection is restored
      this.queueMessage(channel, data);
    }
  }

  subscribe(channel: string): Observable<any> {
    return (
      this.socket$?.pipe(
        filter(message => message.channel === channel),
        map(message => message.data)
      ) || EMPTY
    );
  }

  private reconnect(): void {
    setTimeout(() => this.connect(), 5000);
  }

  private queueMessage(channel: string, data: any): void {
    // Implementation for offline message queuing
  }
}
```

### Component Integration

```typescript
@Component({
  selector: 'app-hero-section',
  template: `
    <section class="hero-section" (click)="onSectionClick($event)">
      <h1>{{ title }}</h1>
      <button class="cta-button" (click)="onCTAClick()" data-analytics="hero-cta">
        {{ buttonText }}
      </button>
    </section>
  `,
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  private intersectionObserver?: IntersectionObserver;

  constructor(private analytics: AnalyticsService) {}

  ngOnInit(): void {
    this.setupViewTracking();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  onCTAClick(): void {
    this.analytics.trackClick('hero-cta', {
      buttonText: this.buttonText,
      position: 'hero-section',
    });

    this.analytics.trackConversion('cta_click', {
      source: 'hero',
      value: 1,
    });
  }

  onSectionClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const analyticsId = target.getAttribute('data-analytics');

    if (analyticsId) {
      this.analytics.trackClick(analyticsId, {
        coordinates: { x: event.clientX, y: event.clientY },
      });
    }
  }

  private setupViewTracking(): void {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.analytics.trackEvent('section_view', {
              section: 'hero',
              visibility: entry.intersectionRatio,
            });
          }
        });
      },
      { threshold: [0.1, 0.5, 0.9] }
    );

    // Observe the section element
    const sectionElement = document.querySelector('.hero-section');
    if (sectionElement) {
      this.intersectionObserver.observe(sectionElement);
    }
  }
}
```

### Form Analytics

```typescript
@Component({
  selector: 'app-lead-form',
  template: `
    <form [formGroup]="leadForm" (ngSubmit)="onSubmit()">
      <input
        type="email"
        formControlName="email"
        (focus)="onFieldFocus('email')"
        (blur)="onFieldBlur('email')"
        (input)="onFieldInput('email')"
      />
      <textarea
        formControlName="message"
        (focus)="onFieldFocus('message')"
        (blur)="onFieldBlur('message')"
        (input)="onFieldInput('message')"
      ></textarea>
      <button type="submit" [disabled]="leadForm.invalid">Submit</button>
    </form>
  `,
})
export class LeadFormComponent {
  leadForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    message: ['', Validators.required],
  });

  private formStartTime?: number;
  private fieldInteractions: Record<string, number> = {};

  constructor(private fb: FormBuilder, private analytics: AnalyticsService) {}

  onFieldFocus(field: string): void {
    if (!this.formStartTime) {
      this.formStartTime = Date.now();
      this.analytics.trackEvent('form_start', { formId: 'lead-form' });
    }

    this.fieldInteractions[field] = Date.now();
    this.analytics.trackFormInteraction('lead-form', field, 'focus');
  }

  onFieldBlur(field: string): void {
    const startTime = this.fieldInteractions[field];
    if (startTime) {
      const timeSpent = Date.now() - startTime;
      this.analytics.trackFormInteraction('lead-form', field, 'blur');
      this.analytics.trackEvent('field_time', {
        field,
        timeSpent,
        formId: 'lead-form',
      });
    }
  }

  onFieldInput(field: string): void {
    this.analytics.trackFormInteraction('lead-form', field, 'input');
  }

  onSubmit(): void {
    if (this.leadForm.valid) {
      const completionTime = this.formStartTime ? Date.now() - this.formStartTime : 0;

      this.analytics.trackConversion('form_submission', {
        formId: 'lead-form',
        completionTime,
        fieldCount: Object.keys(this.leadForm.controls).length,
      });

      this.analytics.trackEvent('form_success', {
        formId: 'lead-form',
        data: this.leadForm.value,
      });
    } else {
      this.analytics.trackEvent('form_error', {
        formId: 'lead-form',
        errors: this.getFormErrors(),
      });
    }
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.leadForm.controls).forEach(key => {
      const control = this.leadForm.get(key);
      if (control?.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }
}
```

## 📈 Performance Monitoring

### Core Web Vitals Tracking

```typescript
@Injectable({
  providedIn: 'root',
})
export class PerformanceService {
  constructor(private analytics: AnalyticsService) {
    this.initializePerformanceTracking();
  }

  private initializePerformanceTracking(): void {
    // Track Core Web Vitals
    this.trackLCP();
    this.trackFID();
    this.trackCLS();

    // Track custom metrics
    this.trackLoadTimes();
    this.trackResourceTimings();
  }

  private trackLCP(): void {
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      const lcpEntry = entries[entries.length - 1];

      this.analytics.trackEvent('performance', {
        metric: 'LCP',
        value: lcpEntry.startTime,
        rating: this.getLCPRating(lcpEntry.startTime),
      });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }

  private trackFID(): void {
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.analytics.trackEvent('performance', {
          metric: 'FID',
          value: entry.processingStart - entry.startTime,
          rating: this.getFIDRating(entry.processingStart - entry.startTime),
        });
      });
    }).observe({ type: 'first-input', buffered: true });
  }

  private trackCLS(): void {
    let clsValue = 0;

    new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });

      this.analytics.trackEvent('performance', {
        metric: 'CLS',
        value: clsValue,
        rating: this.getCLSRating(clsValue),
      });
    }).observe({ type: 'layout-shift', buffered: true });
  }

  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }
}
```

## 🔒 Privacy & Compliance

### GDPR Compliance

```typescript
@Injectable({
  providedIn: 'root',
})
export class PrivacyService {
  private consent$ = new BehaviorSubject<PrivacyConsent>({
    analytics: false,
    marketing: false,
    functional: true,
  });

  readonly consent = this.consent$.asObservable();

  requestConsent(): Observable<PrivacyConsent> {
    // Show consent banner/modal
    return this.showConsentModal().pipe(tap(consent => this.updateConsent(consent)));
  }

  updateConsent(consent: PrivacyConsent): void {
    this.consent$.next(consent);
    localStorage.setItem('privacy-consent', JSON.stringify(consent));

    // Enable/disable analytics based on consent
    if (consent.analytics) {
      this.analytics.enable();
    } else {
      this.analytics.disable();
    }
  }

  private showConsentModal(): Observable<PrivacyConsent> {
    // Implementation for consent modal
    return of({
      analytics: true,
      marketing: false,
      functional: true,
    });
  }
}
```

### Data Anonymization

```typescript
export class DataAnonymizer {
  static anonymizeIP(ip: string): string {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  static anonymizeUserAgent(userAgent: string): string {
    // Remove specific version numbers and personal identifiers
    return userAgent.replace(/\d+\.\d+\.\d+/g, 'x.x.x').replace(/\([^)]*\)/g, '(anonymized)');
  }

  static hashSessionId(sessionId: string): string {
    // Use a one-way hash for session identification
    return btoa(sessionId).substr(0, 16);
  }
}
```

## 📊 Real-time Dashboard

### Dashboard Component

```typescript
@Component({
  selector: 'app-analytics-dashboard',
  template: `
    <div class="dashboard">
      <div class="metric-card">
        <h3>Active Users</h3>
        <div class="metric-value">{{ activeUsers$ | async }}</div>
      </div>

      <div class="metric-card">
        <h3>Page Views</h3>
        <div class="metric-value">{{ pageViews$ | async }}</div>
      </div>

      <div class="metric-card">
        <h3>Conversion Rate</h3>
        <div class="metric-value">{{ conversionRate$ | async }}%</div>
      </div>

      <div class="chart-container">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `,
})
export class AnalyticsDashboardComponent implements OnInit {
  activeUsers$ = this.websocket.subscribe('active-users');
  pageViews$ = this.websocket.subscribe('page-views');
  conversionRate$ = this.websocket.subscribe('conversion-rate');

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private websocket: WebSocketService) {}

  ngOnInit(): void {
    this.setupRealTimeChart();
  }

  private setupRealTimeChart(): void {
    // Chart.js implementation for real-time data visualization
  }
}
```

This analytics system provides comprehensive tracking while maintaining privacy compliance and demonstrating the power of data-driven landing page optimization.

## Quick Event Catalog (Implemented)

- page_view (category: navigation)
- hero_primary_click (category: hero)
- hero_secondary_click (category: hero)
- final_cta_primary_click (category: cta)
- final_cta_secondary_click (category: cta)
- services_cta_click (category: services)
- roi_size_change (category: roi_calculator)
- roi_industry_change (category: roi_calculator)
- modal_open (category: modal)
- modal_close (category: modal)
