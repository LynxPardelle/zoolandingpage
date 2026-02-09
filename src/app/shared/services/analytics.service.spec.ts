import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('tracks events and buffers them', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HttpClient,
          useValue: {
            post: jasmine.createSpy('post').and.returnValue(of({ ok: true })),
          } as any,
        },
      ],
    });
    const svc = TestBed.inject(AnalyticsService);
    spyOn(console, 'log');
    void svc.track('test_event', { category: 'test', label: 'A' });
    const buf = svc.flush();
    expect(buf.length).toBe(1);
    expect(buf[0].name).toBe('test_event');
    expect(buf[0].category).toBe('test');
    expect(buf[0].label).toBe('A');
    expect(typeof buf[0].timestamp).toBe('number');
  });
});
