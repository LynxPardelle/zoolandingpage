import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ElementRef, Injectable } from '@angular/core';

/** Lightweight reusable overlay positioning helper (Phase 2 extraction).
 *  Keeps logic tiny so Tooltip/SearchBox can reuse without duplicating config.
 */
export type OverlayPositioningConfig = {
  readonly positions?: readonly ConnectedPosition[];
  readonly hasBackdrop?: boolean;
  readonly backdropClass?: string;
  readonly offsetY?: number;
  readonly push?: boolean;
  readonly disableFlexibleDimensions?: boolean;
};

const DEFAULT_POSITIONS: readonly ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

@Injectable({ providedIn: 'root' })
export class OverlayPositioningService {
  constructor(private readonly overlay: Overlay) {}

  createConnected(origin: ElementRef<HTMLElement>, cfg: OverlayPositioningConfig = {}): OverlayRef {
    const positions = (cfg.positions?.length ? cfg.positions : DEFAULT_POSITIONS).map(p => ({
      ...p,
      offsetY: p.offsetY ?? cfg.offsetY ?? 0,
    }));
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions(positions)
      .withPush(cfg.push !== false)
      .withFlexibleDimensions(cfg.disableFlexibleDimensions ? false : true);
    return this.overlay.create({
      hasBackdrop: cfg.hasBackdrop !== false,
      backdropClass: cfg.backdropClass ?? 'cdk-overlay-transparent-backdrop',
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });
  }
}
