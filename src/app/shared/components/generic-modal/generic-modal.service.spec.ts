import { GenericModalService } from './generic-modal.service';

describe('GenericModalService analytics', () => {
  it('emits open/close analytics events via stream', (done) => {
    const svc = new GenericModalService();
    const seen: any[] = [];
    const sub = svc.analyticsEvents$.subscribe(e => {
      seen.push(e);
      if (seen.length === 2) {
        expect(seen[0]).toEqual(jasmine.objectContaining({ name: 'modal_open', category: 'modal', label: 'spec-modal' }));
        expect(seen[1]).toEqual(jasmine.objectContaining({ name: 'modal_close', category: 'modal', label: 'spec-modal' }));
        sub.unsubscribe();
        done();
      }
    });
    const ref = svc.open({ id: 'spec-modal' });
    expect(ref.id).toBe('spec-modal');
    svc.close();
  });
});
