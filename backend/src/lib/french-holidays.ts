// Jumeau de src/app/shared/calendar/french-holidays.ts, calculé en UTC pour ne pas dépendre du
// fuseau du conteneur : toute modification se fait des deux côtés.

const DAY_MS = 24 * 60 * 60 * 1000;

function easterSundayUtc(year: number): number {
  // Algorithme de Meeus/Jones/Butcher
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day);
}

function isoAfterEaster(easter: number, days: number): string {
  return new Date(easter + days * DAY_MS).toISOString().slice(0, 10);
}

function frenchHolidays(year: number): ReadonlyMap<string, string> {
  const easter = easterSundayUtc(year);
  return new Map([
    [`${year}-01-01`, 'Jour de l’An'],
    [isoAfterEaster(easter, 1), 'Lundi de Pâques'],
    [`${year}-05-01`, 'Fête du Travail'],
    [`${year}-05-08`, 'Victoire 1945'],
    [isoAfterEaster(easter, 39), 'Ascension'],
    [isoAfterEaster(easter, 50), 'Lundi de Pentecôte'],
    [`${year}-07-14`, 'Fête nationale'],
    [`${year}-08-15`, 'Assomption'],
    [`${year}-11-01`, 'Toussaint'],
    [`${year}-11-11`, 'Armistice 1918'],
    [`${year}-12-25`, 'Noël'],
  ]);
}

export function getUnavailableDayReason(isoDate: string): string | null {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  const holiday = frenchHolidays(year).get(isoDate);
  if (holiday) return holiday;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6 ? 'Weekend' : null;
}
