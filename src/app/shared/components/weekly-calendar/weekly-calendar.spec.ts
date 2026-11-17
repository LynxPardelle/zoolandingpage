import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WeeklyCalendarComponent } from './weekly-calendar.component';
import { classCalendarFiles, nextWeeklyClass, type WeeklyCalendarConfig } from './weekly-calendar';

const group: WeeklyCalendarConfig = {
  weekday: 1, localTime: '17:00', timeZone: 'America/Mexico_City', durationMinutes: 60,
  summary: 'Dipsy Doo! · Rockabilly Jive', location: 'Nueva Santa María, CDMX',
  description: 'Confirma antes de ir.',
  url: 'https://dipsydoo.com.mx/horarios-y-sedes#nueva-santa-maria',
  uid: 'rockabilly-jive-lunes-1700', ariaLabel: 'Agregar al calendario: Rockabilly Jive',
};

const start = Date.parse('2026-11-16T23:00:00Z');
const decode = (href: string) => decodeURIComponent(href.split(',')[1]).replace(/\r\n /g, '');

describe('WeeklyCalendar', () => {
  it('advances at the class start and finds the correct weekday years later', () => {
    expect(nextWeeklyClass(group, start - 1)).toBe(start);
    expect(new Date(nextWeeklyClass(group, start)).toISOString()).toBe('2026-11-23T23:00:00.000Z');
    const yearEdge = {...group, weekday: 4, localTime: '20:00'};
    expect(new Date(nextWeeklyClass(yearEdge, Date.parse('2027-01-01T01:59:59Z'))).toISOString())
      .toBe('2027-01-01T02:00:00.000Z');
    expect(new Date(nextWeeklyClass(group, Date.parse('2032-02-29T20:00:00Z'))).toISOString())
      .toBe('2032-03-01T23:00:00.000Z');
  });

  it('generates both file formats with the same next start and two alarms', () => {
    const files = classCalendarFiles(group, Date.parse('2027-06-07T22:00:00Z'));
    const [single, series] = [files.single, files.weekly].map(file => decode(file.href));
    for (const body of [single, series]) {
      expect(body).toContain('DTSTART:20270607T230000Z');
      expect(body).toContain('DTEND:20270608T000000Z');
      expect(body).toContain('TRIGGER:-P1D');
      expect(body).toContain('TRIGGER:-PT1H');
      expect(body).toContain('LOCATION:Nueva Santa María\\, CDMX');
    }
    expect(single).not.toContain('RRULE:');
    expect(series).toContain('RRULE:FREQ=WEEKLY\r\n');
    expect(files.single.name).toContain('2027-06-07.ics');
  });

  it('updates the download at the cutoff while leaving the disclosure open', () => {
    const clock = jasmine.clock();
    clock.install();
    let fixture: ComponentFixture<WeeklyCalendarComponent> | undefined;
    try {
      clock.mockDate(new Date(start - 1000));
      fixture = TestBed.createComponent(WeeklyCalendarComponent);
      fixture.componentRef.setInput('config', group);
      fixture.detectChanges();
      fixture.detectChanges();
      const details: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
      details.open = true;
      const link = details.querySelector('a')!;
      expect(decode(link.href)).toContain('DTSTART:20261116T230000Z');
      clock.tick(1000);
      fixture.detectChanges();
      expect(details.open).toBeTrue();
      expect(decode(link.href)).toContain('DTSTART:20261123T230000Z');
    } finally {
      fixture?.destroy();
      clock.uninstall();
    }
  });
});
