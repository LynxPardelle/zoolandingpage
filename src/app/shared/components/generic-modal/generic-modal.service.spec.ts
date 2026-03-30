import { TestBed } from '@angular/core/testing';
import { AngoraCombosService } from '../../services/angora-combos.service';
import { GenericModalService } from './generic-modal.service';

describe('GenericModalService analytics', () => {
  it('emits open/close analytics events via stream', () => {
    const scheduleCssCreate = jasmine.createSpy('scheduleCssCreate');

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AngoraCombosService,
          useValue: { scheduleCssCreate },
        },
      ],
    });
    const svc = TestBed.inject(GenericModalService);
    const seen: any[] = [];
    const sub = svc.analyticsEvents$.subscribe(e => {
      seen.push(e);
    });
    const ref = svc.open({ id: 'spec-modal' });
    expect(ref.id).toBe('spec-modal');
    svc.close();
    expect(seen[0]).toEqual(jasmine.objectContaining({ name: 'modal_open', category: 'modal', label: 'spec-modal' }));
    expect(seen[1]).toEqual(jasmine.objectContaining({ name: 'modal_close', category: 'modal', label: 'spec-modal' }));
    expect(scheduleCssCreate).toHaveBeenCalledTimes(2);
    sub.unsubscribe();
  });
});
