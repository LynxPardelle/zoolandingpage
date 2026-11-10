import { FocusTrapFactory } from '@angular/cdk/a11y';
import { Overlay } from '@angular/cdk/overlay';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AngoraCombosService } from '../../services/angora-combos.service';
import { AriaLiveService } from '../../services/aria-live.service';
import { I18nService } from '../../services/i18n.service';
import { MotionPreferenceService } from '../../services/motion-preference.service';
import { GenericModalComponent } from './generic-modal.component';
import { GenericModalService } from './generic-modal.service';

describe('GenericModalComponent', () => {
  let fixture: ComponentFixture<GenericModalComponent>;
  let comp: GenericModalComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericModalComponent],
      providers: [
        {
          provide: GenericModalService,
          useValue: {
            modalRef: signal(null),
            close: jasmine.createSpy('close'),
          },
        },
        {
          provide: Overlay,
          useValue: {
            create: () => ({
              hasAttached: () => false,
              attach: () => undefined,
              dispose: () => undefined,
              backdropClick: () => ({ subscribe: () => undefined }),
            }),
            scrollStrategies: { block: () => undefined },
          },
        },
        {
          provide: FocusTrapFactory,
          useValue: {
            create: () => ({
              focusInitialElementWhenReady: () => undefined,
              destroy: () => undefined,
            }),
          },
        },
        { provide: MotionPreferenceService, useValue: { reduced: () => false } },
        { provide: AngoraCombosService, useValue: { updateRenderedDomClasses: () => undefined } },
        { provide: I18nService, useValue: { tOr: (_key: string, fallback: string) => fallback } },
        { provide: AriaLiveService, useValue: { announce: () => undefined } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GenericModalComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(comp).toBeTruthy();
  });

  it('resolves default close button aria label', () => {
    expect(comp.closeButtonAriaLabel()).toBe('Close modal');
  });
  it('keeps blocking reauthentication open on Escape, without changing the default',()=>{
    spyOn(comp,'isOpen').and.returnValue(true);
    comp.config={closeOnEscape:false} as never;
    comp.onEsc();
    expect(TestBed.inject(GenericModalService).close).not.toHaveBeenCalled();
    comp.config={};comp.onEsc();
    expect(TestBed.inject(GenericModalService).close).toHaveBeenCalledTimes(1);
  });
});

describe('GenericModalComponent with a real overlay', () => {
  it('styles and focuses the first attached dialog before restoring focus on close', async () => {
    const active = signal<{ id: string } | null>(null);
    const updateRenderedDomClasses = jasmine.createSpy('updateRenderedDomClasses');
    await TestBed.configureTestingModule({
      imports: [GenericModalComponent],
      providers: [
        { provide: GenericModalService, useValue: { modalRef: active, close: () => active.set(null) } },
        { provide: AngoraCombosService, useValue: { updateRenderedDomClasses } },
        { provide: MotionPreferenceService, useValue: { reduced: () => true } },
        { provide: I18nService, useValue: { tOr: (_key: string, fallback: string) => fallback } },
        { provide: AriaLiveService, useValue: { announce: () => undefined } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(GenericModalComponent);
    const trigger = document.createElement('button');
    document.body.append(trigger);
    try {
      fixture.detectChanges();
      trigger.focus();
      active.set({ id: 'navigation' });
      fixture.detectChanges();
      await fixture.whenStable();
      const dialog = document.querySelector<HTMLElement>('.cdk-overlay-pane [role="dialog"]')!;
      expect(dialog).not.toBeNull();
      expect(getComputedStyle(dialog).overflowY).toBe('auto');
      expect(getComputedStyle(dialog).maxHeight).not.toBe('none');
      expect(getComputedStyle(dialog).pointerEvents).toBe('auto');
      expect(dialog.contains(document.activeElement)).toBeTrue();
      expect(updateRenderedDomClasses).toHaveBeenCalledWith(dialog.closest('.cdk-overlay-pane'));
      active.set(null);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(dialog.isConnected).toBeFalse();
      expect(document.activeElement).toBe(trigger);
    } finally {
      fixture.destroy();
      trigger.remove();
    }
  });
});
