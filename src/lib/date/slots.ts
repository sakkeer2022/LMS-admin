export function utcInstant(value: string) { if (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Use ISO timestamps with an explicit UTC offset'); return new Date(value); }
export function formatSlot(value: string, timeZone: string, locale = 'en-IN') { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(utcInstant(value)); }
export function beforeCutoff(startsAt: string, now = Date.now(), cutoffMinutes = 60) { return utcInstant(startsAt).getTime() - now > cutoffMinutes * 60_000; }
export function remainingSeconds(endsAt: string, now = Date.now()) { return Math.max(0, Math.ceil((utcInstant(endsAt).getTime() - now) / 1000)); }
