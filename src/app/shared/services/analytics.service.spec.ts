import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('tracks events and buffers them', () => {
    const svc = new AnalyticsService();
    spyOn(console, 'log');
    svc.track('test_event', { category: 'test', label: 'A' });
    const buf = svc.flush();
    expect(buf.length).toBe(1);
    expect(buf[0].name).toBe('test_event');
    expect(buf[0].category).toBe('test');
    expect(buf[0].label).toBe('A');
    expect(typeof buf[0].timestamp).toBe('number');
  });
});
