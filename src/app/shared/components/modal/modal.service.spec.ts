import { AnalyticsService } from '../../services/analytics.service';
import { ModalService } from './modal.service';

describe('ModalService analytics', () => {
  it('emits open/close analytics', () => {
    const analytics = new AnalyticsService();
    spyOn(analytics, 'track').and.callThrough();
    const svc = new ModalService();
    // Patch private analytics via prototype for test (simple DI-less test)
    (svc as any).analytics = analytics;

    const ref = svc.open({ id: 'spec-modal' });
    expect(analytics.track).toHaveBeenCalledWith('modal_open', { category: 'modal', label: ref.id });

    svc.close();
    expect(analytics.track).toHaveBeenCalledWith('modal_close', { category: 'modal', label: 'spec-modal' });
  });
});
