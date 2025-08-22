import { OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewContainerRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { OverlayPositioningService } from '../../../services/overlay-positioning.service';
import { TooltipConfig, TooltipPosition } from './tooltip.types';

@Component({
  selector: 'app-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent {
  private readonly pos = inject(OverlayPositioningService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly vcr = inject(ViewContainerRef);
  private overlayRef: OverlayRef | null = null;
  @Input() for?: HTMLElement | string; // anchor element or id

  readonly config = input<TooltipConfig | null>(null);
  readonly visible = signal(false);
  readonly content = input<string>('');
  @Input() arrow = true;
  @Input() richTemplate?: any; // optional ng-template for rich content
  private showTimer: any;
  private hideTimer: any;

  readonly id = computed(() => this.config()?.id || `tt-${Math.random().toString(36).slice(2)}`);
  readonly ariaDescription = computed(() => this.config()?.ariaDescription || this.content());
  readonly ariaLive = computed(() => this.config()?.ariaLive || 'off');

  ngOnInit(): void {
    const trigger = this.resolveTrigger();
    const anchor = this.resolveAnchor();
    if (!anchor) return;
    if (trigger !== 'focus') {
      anchor.addEventListener('mouseenter', this.scheduleShow);
      anchor.addEventListener('mouseleave', this.scheduleHide);
    }
    if (trigger !== 'hover') {
      anchor.addEventListener('focus', this.scheduleShow);
      anchor.addEventListener('blur', this.scheduleHide);
    }
    anchor.setAttribute('aria-describedby', this.id());
  }
  ngOnDestroy(): void {
    this.clearTimers();
    this.destroyOverlay();
    const anchor = this.resolveAnchor();
    if (anchor) {
      anchor.removeAttribute('aria-describedby');
      anchor.removeEventListener('mouseenter', this.scheduleShow);
      anchor.removeEventListener('mouseleave', this.scheduleHide);
      anchor.removeEventListener('focus', this.scheduleShow);
      anchor.removeEventListener('blur', this.scheduleHide);
    }
  }

  private resolveTrigger(): 'hover' | 'focus' | 'both' {
    return this.config()?.trigger || 'both';
  }
  private resolveAnchor(): HTMLElement | null {
    if (this.for instanceof HTMLElement) return this.for;
    if (typeof this.for === 'string') return document.getElementById(this.for) as HTMLElement;
    return this.host.nativeElement.parentElement; // fallback: wrapper pattern
  }
  private scheduleShow = () => {
    this.clearTimers();
    const d = this.config()?.showDelayMs ?? 150;
    this.showTimer = setTimeout(() => this.show(), d);
  };
  private scheduleHide = () => {
    this.clearTimers();
    const d = this.config()?.hideDelayMs ?? 100;
    this.hideTimer = setTimeout(() => this.hide(), d);
  };
  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
  show(): void {
    if (this.visible() || !this.content()) return;
    const anchor = this.resolveAnchor();
    if (!anchor) return;
    const position = this.config()?.position || 'top';
    const positions = this.buildPositions(position);
    this.overlayRef = this.pos.createConnected(new ElementRef(anchor), {
      hasBackdrop: false,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positions,
      disableFlexibleDimensions: true,
    });
    const portal = new TemplatePortal(this.tooltipTpl, this.vcr);
    this.overlayRef.attach(portal);
    this.visible.set(true);
    document.addEventListener('keydown', this.onDocKey, { once: true });
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange, true);
  }
  hide(): void {
    this.destroyOverlay();
    this.visible.set(false);
  }
  private destroyOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange, true);
  }

  private onDocKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.hide();
  };

  private buildPositions(pos: TooltipPosition) {
    // Provide primary + fallback flip positions
    const map: Record<TooltipPosition, any[]> = {
      top: [
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -6 },
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 6 },
      ],
      bottom: [
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 6 },
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -6 },
      ],
      left: [
        { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -6 },
        { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 6 },
      ],
      right: [
        { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 6 },
        { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -6 },
      ],
    };
    return map[pos] || map.top;
  }

  private onViewportChange = () => {
    if (this.visible()) this.reposition();
  };
  private reposition() {
    // let CDK strategy handle; detach/reattach ensures recalculation
    if (this.overlayRef && this.overlayRef.hasAttached()) {
      this.overlayRef.updatePosition();
    }
  }

  @Input('tooltipTpl') tooltipTpl!: any; // template reference
}
