import { FocusTrapFactory } from '@angular/cdk/a11y';
import { Overlay } from '@angular/cdk/overlay';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
