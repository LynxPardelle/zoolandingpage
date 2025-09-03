import { ModalService } from './modal.service';

describe('ModalService analytics', () => {
  it('emits open/close analytics events via stream', (done) => {
    const svc = new ModalService();
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
