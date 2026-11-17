export const WEEKLY_CALENDAR_TIME_ZONE = 'America/Mexico_City';

export type WeeklyCalendarConfig = {
  readonly weekday: number;
  readonly localTime: string;
  readonly durationMinutes: number;
  readonly timeZone: typeof WEEKLY_CALENDAR_TIME_ZONE;
  readonly summary: string;
  readonly location: string;
  readonly description: string;
  readonly url: string;
  readonly uid: string;
  readonly ariaLabel: string;
};

const dayMs = 86_400_000;
const localDate = new Intl.DateTimeFormat('en', {
  timeZone: WEEKLY_CALENDAR_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const localOffset = new Intl.DateTimeFormat('en', {
  timeZone: WEEKLY_CALENDAR_TIME_ZONE, timeZoneName: 'longOffset',
});
const dateLabel = new Intl.DateTimeFormat('es-MX', {
  timeZone: WEEKLY_CALENDAR_TIME_ZONE, dateStyle: 'full', timeStyle: 'short',
});

function localDay(timestamp: number): number {
  const parts = Object.fromEntries(localDate.formatToParts(timestamp).map(({type, value}) => [type, value]));
  return Date.UTC(Number(parts['year']), Number(parts['month']) - 1, Number(parts['day']));
}

function toInstant(wallTime: number): number {
  const offset = localOffset.formatToParts(wallTime).find(({type}) => type === 'timeZoneName')?.value.slice(3);
  return Date.parse(new Date(wallTime).toISOString().slice(0, -1) + (offset || 'Z'));
}

export function nextWeeklyClass(config: WeeklyCalendarConfig, now: number): number {
  const day = localDay(now);
  const daysUntil = (config.weekday - new Date(day).getUTCDay() + 7) % 7;
  const [hour, minute] = config.localTime.split(':').map(Number);
  const wallTime = day + daysUntil * dayMs + (hour * 60 + minute) * 60_000;
  const first = toInstant(wallTime);
  return first > now ? first : toInstant(wallTime + 7 * dayMs);
}

const stamp = (time: number) => new Date(time).toISOString().replace(/[-:]|\.\d{3}/g, '');
const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n?|\n/g, '\\n').replace(/[;,]/g, '\\$&');
const encoder = new TextEncoder();

function foldCalendarLine(line: string): string {
  let result = '';
  let bytes = 0;
  for (const char of line) {
    const length = encoder.encode(char).length;
    if (bytes + length > 75) {
      result += '\r\n ';
      bytes = 1;
    }
    result += char;
    bytes += length;
  }
  return result;
}

export function classCalendarFiles(config: WeeklyCalendarConfig, now: number) {
  const start = nextWeeklyClass(config, now);
  const end = start + config.durationMinutes * 60_000;
  const day = new Date(localDay(start)).toISOString().slice(0, 10);
  const url = new URL(config.url);
  const summary = escapeText(config.summary);
  const alarms = ['-P1D', '-PT1H'].flatMap(trigger => [
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:' + trigger, 'DESCRIPTION:' + summary, 'END:VALARM',
  ]);

  function makeFile(suffix: string, weekly: boolean) {
    const id = config.uid + '-' + suffix;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zoolandingpage//Weekly classes//ES',
      'BEGIN:VEVENT', 'UID:' + id + '@' + url.hostname, 'DTSTAMP:' + stamp(now),
      'DTSTART:' + stamp(start), 'DTEND:' + stamp(end),
      // Mexico City has a fixed offset for currently scheduled classes.
      ...(weekly ? ['RRULE:FREQ=WEEKLY'] : []),
      'SUMMARY:' + summary, 'LOCATION:' + escapeText(config.location),
      'DESCRIPTION:' + escapeText(config.description), 'URL:' + url.href,
      ...alarms, 'END:VEVENT', 'END:VCALENDAR',
    ];
    return {
      href: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.map(foldCalendarLine).join('\r\n') + '\r\n'),
      name: id + '.ics',
    };
  }

  return {
    start,
    startIso: new Date(start).toISOString(),
    label: dateLabel.format(start),
    single: makeFile(day, false),
    weekly: makeFile('semanal', true),
  };
}
